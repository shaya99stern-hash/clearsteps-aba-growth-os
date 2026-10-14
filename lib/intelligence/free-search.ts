import { isObviouslyPublicHttpUrl, validatePublicHttpUrl } from "./network-safety";
import { robotsAllows } from "./robots";
import { CircuitBreaker, CoalescingCache, Semaphore, readTextCapped } from "./runtime";
import type { EnrichedWebsite, PublicSearchHit } from "./source-types";

const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const USER_AGENT = "Mozilla/5.0 ClearStepsResearch/1.0";
const SEARCH_TIMEOUT_MS = 5_000;
const ENRICH_TIMEOUT_MS = 9_000;
/** Public pages above this size are truncated; contact details live near the top or footer of real pages. */
const MAX_PAGE_BYTES = 1_500_000;

type SearchProvider = {
  id: "duckduckgo-html" | "bing-rss";
  label: string;
  gate: Semaphore;
  breaker: CircuitBreaker;
  run: (query: string, requested: number) => Promise<PublicSearchHit[]>;
};

// Scout fires up to ~40 searches per run; bounded per-provider concurrency avoids tripping the
// providers' abuse protection, and an open breaker skips a provider that is already refusing us.
const providers: SearchProvider[] = [
  {
    id: "duckduckgo-html",
    label: "DuckDuckGo",
    gate: new Semaphore(4),
    breaker: new CircuitBreaker(3, 120_000),
    run: async (query) => {
      const response = await fetch(SEARCH_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
        body: new URLSearchParams({ q: query, kl: "us-en" }),
        redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });
      // DuckDuckGo answers rate-limited clients with HTTP 202 and an anomaly page, not an error code.
      if (!response.ok || response.status === 202) throw new Error("HTTP " + response.status);
      const html = await readTextCapped(response, MAX_PAGE_BYTES);
      if (/anomaly-modal|class="anomaly/i.test(html)) throw new Error("rate limited (anomaly page)");
      return parseDuckDuckGo(html, query);
    },
  },
  {
    id: "bing-rss",
    label: "Bing RSS",
    gate: new Semaphore(4),
    breaker: new CircuitBreaker(3, 120_000),
    // Public RSS, not a paid search API. No tokens and no scraping login walls.
    run: async (query, requested) => {
      const rssUrl = "https://www.bing.com/search?" + new URLSearchParams({ format: "rss", q: query, count: String(requested) });
      const response = await fetch(rssUrl, {
        headers: { accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS), cache: "no-store",
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return parseBingRss(await readTextCapped(response, MAX_PAGE_BYTES), query);
    },
  },
];

// Only non-empty result sets are cached, so a transient provider failure is retried on the next run.
const searchCache = new CoalescingCache<PublicSearchHit[]>(600, 30 * 60_000, (hits) => hits.length > 0);
const pageCache = new CoalescingCache<EnrichedWebsite | null>(300, 30 * 60_000, (page) => page !== null);
const stats = { searches: 0, searchCacheHits: 0, providerSkips: 0, pages: 0, pageCacheHits: 0 };

export async function searchPublicWeb(query: string, limit = 8): Promise<PublicSearchHit[]> {
  const requested = Math.max(1, Math.min(limit, 20));
  const key = query.trim().replace(/\s+/g, " ").toLowerCase() + "|" + requested;
  stats.searches += 1;
  if (searchCache.peek(key)) stats.searchCacheHits += 1;
  return searchCache.get(key, () => searchProviders(query, requested));
}

async function searchProviders(query: string, requested: number): Promise<PublicSearchHit[]> {
  const errors: string[] = [];
  for (const provider of providers) {
    if (provider.breaker.isOpen) {
      stats.providerSkips += 1;
      errors.push(provider.label + ": skipped after repeated failures (cooling down)");
      continue;
    }
    try {
      const results = await provider.gate.run(() => provider.run(query, requested));
      provider.breaker.recordSuccess();
      if (results.length > 0) return results.slice(0, requested);
      errors.push(provider.label + " had no parseable public results");
    } catch (error) {
      provider.breaker.recordFailure();
      errors.push(provider.label + ": " + (error instanceof Error ? error.message : "unavailable"));
    }
  }
  throw new Error(errors.join("; "));
}

/** Counters for the Sources surface and tests. Values accumulate for the server instance's lifetime. */
export function publicSearchRuntimeStats() {
  return {
    ...stats,
    providers: providers.map((provider) => ({ id: provider.id, coolingDown: provider.breaker.isOpen, queued: provider.gate.pending })),
  };
}

/** Test hook: forget cached results and provider failures. */
export function resetPublicSearchRuntime() {
  searchCache.clear();
  pageCache.clear();
  for (const provider of providers) provider.breaker.reset();
  Object.assign(stats, { searches: 0, searchCacheHits: 0, providerSkips: 0, pages: 0, pageCacheHits: 0 });
}

export function parseBingRss(xml: string, query: string): PublicSearchHit[] {
  const result: PublicSearchHit[]=[];
  const blocks=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks.slice(0,25)) {
    const rawLink=firstMatch(block,/<link>([\s\S]*?)<\/link>/i).trim();
    const url=decodeHtml(rawLink.replace(/^<!\[CDATA\[|\]\]>$/g,""));
    if (!isObviouslyPublicHttpUrl(url)) continue;
    result.push({
      title:htmlToText(firstMatch(block,/<title>([\s\S]*?)<\/title>/i)).slice(0,240),
      url, snippet:htmlToText(firstMatch(block,/<description>([\s\S]*?)<\/description>/i)).slice(0,700),
      query,sourceId:"bing-rss",rank:result.length+1,
    });
  }
  return dedupeHits(result);
}

export async function enrichPublicWebsite(url: string): Promise<EnrichedWebsite | null> {
  stats.pages += 1;
  const key = normalizeUrl(url);
  if (pageCache.peek(key)) stats.pageCacheHits += 1;
  return pageCache.get(key, () => fetchAndExtract(url));
}

async function fetchAndExtract(url: string): Promise<EnrichedWebsite | null> {
  const safeUrl = await validatePublicHttpUrl(url);
  if (!safeUrl || !(await robotsAllows(safeUrl))) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);
  try {
    const response = await fetchPublicHtml(safeUrl, controller.signal);
    if (!response) return null;
    const html = await readTextCapped(response, MAX_PAGE_BYTES);
    return extractPublicPage(html, safeUrl, response.url || safeUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pure HTML → enrichment record. Exported for deterministic tests. */
export function extractPublicPage(html: string, url: string, finalUrl = url): EnrichedWebsite {
  const text = htmlToText(html);
  return {
    url,
    finalUrl,
    title: htmlToText(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
    emails: extractEmails(html),
    phones: extractPhones(text),
    textSample: text.slice(0, 5_000),
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchPublicHtml(startUrl: string, signal: AbortSignal) {
  let current = startUrl;
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    const validated = await validatePublicHttpUrl(current);
    if (!validated) return null;
    const response = await fetch(validated, {
      headers: { "user-agent": USER_AGENT },
      redirect: "manual",
      cache: "no-store",
      signal,
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 4) return null;
      current = new URL(location, validated).toString();
      continue;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;
    return response;
  }
  return null;
}

function parseDuckDuckGo(html: string, query: string): PublicSearchHit[] {
  const hits: PublicSearchHit[] = [];
  const resultPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/gi;
  let match: RegExpExecArray | null;
  while ((match = resultPattern.exec(html)) && hits.length < 20) {
    const rawUrl = decodeHtml(match[1]);
    const resolvedUrl = unwrapDuckDuckGoUrl(rawUrl);
    if (!isObviouslyPublicHttpUrl(resolvedUrl)) continue;
    // Sponsored results route through DuckDuckGo's ad redirector and are not organic public evidence.
    if (/^https?:\/\/(?:[^/]+\.)?duckduckgo\.com\/y\.js/i.test(resolvedUrl)) continue;
    hits.push({
      title: htmlToText(match[2]).slice(0, 240),
      url: resolvedUrl,
      snippet: htmlToText(match[3]).slice(0, 700),
      query,
      sourceId: "duckduckgo-html",
      rank: hits.length + 1,
    });
  }
  return dedupeHits(hits);
}

export { parseDuckDuckGo as parseDuckDuckGoHtml };

function dedupeHits(hits: PublicSearchHit[]) {
  const unique = new Map<string, PublicSearchHit>();
  for (const hit of hits) {
    const key = normalizeUrl(hit.url);
    if (!unique.has(key)) unique.set(key, hit);
  }
  // Keep ranks contiguous after duplicates are dropped.
  return [...unique.values()].map((hit, index) => ({ ...hit, rank: index + 1 }));
}

function unwrapDuckDuckGoUrl(value: string) {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const target = url.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return value;
  }
}

const TRACKING_PARAMS = /^(utm_[a-z]+|gclid|fbclid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi|ref_src)$/i;

export function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
    return url.toString();
  } catch {
    return value;
  }
}

function htmlToText(value: string) {
  return decodeHtml(
    value
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", middot: "·", bull: "•", copy: "©", reg: "®", trade: "™",
};

/** Single-pass decoder so `&amp;lt;` stays `&lt;` instead of being decoded twice. */
export function decodeHtml(value = "") {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

function firstMatch(value: string, pattern: RegExp) {
  return pattern.exec(value)?.[1] ?? "";
}

// Retina asset names (logo@2x.png) and bundler artefacts look like addresses to a naive pattern.
const NON_MAILBOX_SUFFIX = /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp|css|js|mjs|json|map|woff2?|ttf|eot|mp4|webm|pdf)$/i;
const PLACEHOLDER_DOMAIN = /@(example\.(com|org|net)|domain\.com|email\.com|yourdomain\.com|yoursite\.com|sentry\.io|[\w-]*sentry[\w.-]*|wixpress\.com)$/i;
const PLACEHOLDER_LOCAL = /^(your|name|email|user|username|first\.?last|john\.?doe|jane\.?doe|test)@/i;

export function extractEmails(html: string) {
  const source = decodeHtml(html).replace(/mailto:([^"'?>\s]+)/gi, (_, address: string) => {
    try {
      return " " + decodeURIComponent(address) + " ";
    } catch {
      return " " + address + " ";
    }
  });
  const found = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,24}/gi) ?? [])
    .map((item) => item.toLowerCase().replace(/^[._%+-]+/, ""))
    .filter((email) =>
      !NON_MAILBOX_SUFFIX.test(email) &&
      !PLACEHOLDER_DOMAIN.test(email) &&
      !PLACEHOLDER_LOCAL.test(email) &&
      !/@\d+x\./.test(email) &&
      email.split("@")[0].length <= 64,
    );
  return Array.from(new Set(found)).slice(0, 10);
}

/**
 * North American numbers only, validated against NANP structure (area code and exchange cannot
 * start with 0/1) and de-duplicated by digits so "(816) 555-0100" and "816.555.0100" count once.
 * Reserved fictional numbers (555-0100..0199) are dropped.
 */
export function extractPhones(text: string) {
  const unique = new Map<string, string>();
  for (const match of text.match(/(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]\d{4}\b/g) ?? []) {
    const digits = match.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    if (digits.length !== 10) continue;
    const area = digits.slice(0, 3);
    const exchange = digits.slice(3, 6);
    const line = digits.slice(6);
    if (/^[01]/.test(area) || /^[01]/.test(exchange) || /(\d)\1{9}/.test(digits)) continue;
    if (/^\d11$/.test(area) || /^\d11$/.test(exchange)) continue;
    if (exchange === "555" && /^01\d\d$/.test(line)) continue;
    if (!unique.has(digits)) unique.set(digits, `(${area}) ${exchange}-${line}`);
  }
  return [...unique.values()].slice(0, 10);
}
