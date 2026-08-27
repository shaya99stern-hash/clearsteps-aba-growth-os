import type { EnrichedWebsite, PublicSearchHit } from "./source-types";

const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";

export async function searchPublicWeb(query: string, limit = 8): Promise<PublicSearchHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const body = new URLSearchParams({ q: query, kl: "us-en" });
    const response = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "Mozilla/5.0 ClearStepsResearch/1.0",
      },
      body,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Public search returned ${response.status}.`);
    return parseDuckDuckGo(await response.text(), query).slice(0, Math.max(1, Math.min(limit, 20)));
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichPublicWebsite(url: string): Promise<EnrichedWebsite | null> {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(safeUrl, {
      headers: { "user-agent": "Mozilla/5.0 ClearStepsResearch/1.0" },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return null;
    const html = await response.text();
    const text = htmlToText(html);
    return {
      url: safeUrl,
      finalUrl: response.url || safeUrl,
      title: decodeHtml(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
      emails: extractEmails(html),
      phones: extractPhones(text),
      textSample: text.slice(0, 5_000),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseDuckDuckGo(html: string, query: string): PublicSearchHit[] {
  const hits: PublicSearchHit[] = [];
  const resultPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/gi;
  let match: RegExpExecArray | null;
  while ((match = resultPattern.exec(html)) && hits.length < 20) {
    const rawUrl = decodeHtml(match[1]);
    const resolvedUrl = unwrapDuckDuckGoUrl(rawUrl);
    if (!safeHttpUrl(resolvedUrl)) continue;
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

function dedupeHits(hits: PublicSearchHit[]) {
  return Array.from(new Map(hits.map((hit) => [normalizeUrl(hit.url), hit])).values());
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

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "0.0.0.0" ||
      host === "::1" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return value;
  }
}

function htmlToText(value: string) {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function firstMatch(value: string, pattern: RegExp) {
  return pattern.exec(value)?.[1] ?? "";
}

function extractEmails(value: string) {
  return Array.from(
    new Set((value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((item) => item.toLowerCase())),
  ).filter((email) => !email.endsWith("@example.com")).slice(0, 10);
}

function extractPhones(value: string) {
  return Array.from(
    new Set(
      (value.match(/(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}/g) ?? [])
        .map((item) => item.replace(/\s+/g, " ").trim()),
    ),
  ).slice(0, 10);
}
