// Scout request runtime: caching, coalescing, provider failover, contact extraction, robots
// matching, and an end-to-end Scout run that must finish inside the serverless limit even when
// every upstream hangs.
import assert from "node:assert/strict";
import {
  CircuitBreaker,
  CoalescingCache,
  Deadline,
  Semaphore,
  TtlCache,
  readTextCapped,
  withinBudget,
} from "../lib/intelligence/runtime";
import {
  decodeHtml,
  extractEmails,
  extractPhones,
  extractPublicPage,
  normalizeUrl,
  parseDuckDuckGoHtml,
  publicSearchRuntimeStats,
  resetPublicSearchRuntime,
  searchPublicWeb,
} from "../lib/intelligence/free-search";
import { isAllowed, parseRobots } from "../lib/intelligence/robots";

const realFetch = globalThis.fetch;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runtimePrimitives() {
  let clock = 0;
  const lru = new TtlCache<number>(2, 100, () => clock);
  lru.set("a", 1);
  lru.set("b", 2);
  assert.equal(lru.get("a"), 1, "read refreshes recency");
  lru.set("c", 3);
  assert.equal(lru.get("b"), undefined, "least recently used entry is evicted");
  assert.equal(lru.get("a"), 1);
  clock = 150;
  assert.equal(lru.get("a"), undefined, "entries expire after their TTL");

  let loads = 0;
  const coalescing = new CoalescingCache<string>(10, 1_000, (value) => value !== "bad");
  const load = async () => { loads += 1; await sleep(20); return "ok"; };
  const [first, second] = await Promise.all([coalescing.get("k", load), coalescing.get("k", load)]);
  assert.equal(first, "ok");
  assert.equal(second, "ok");
  assert.equal(loads, 1, "concurrent callers share one upstream request");
  await coalescing.get("k", load);
  assert.equal(loads, 1, "settled value is served from cache");
  let badLoads = 0;
  await coalescing.get("x", async () => { badLoads += 1; return "bad"; });
  await coalescing.get("x", async () => { badLoads += 1; return "bad"; });
  assert.equal(badLoads, 2, "values rejected by shouldCache are re-fetched");
  await assert.rejects(coalescing.get("err", async () => { throw new Error("boom"); }));
  assert.equal(await coalescing.get("err", async () => "recovered"), "recovered", "failures are not cached");

  const gate = new Semaphore(2);
  let active = 0;
  let peak = 0;
  await Promise.all(Array.from({ length: 7 }, () => gate.run(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await sleep(5);
    active -= 1;
  })));
  assert.equal(peak, 2, "semaphore bounds concurrency");

  let now = 0;
  const breaker = new CircuitBreaker(2, 1_000, () => now);
  breaker.recordFailure();
  assert.equal(breaker.isOpen, false);
  breaker.recordFailure();
  assert.equal(breaker.isOpen, true, "opens after threshold consecutive failures");
  now = 1_001;
  assert.equal(breaker.isOpen, false, "half-opens after cooldown");
  breaker.recordFailure();
  assert.equal(breaker.isOpen, true, "a failed trial request re-opens immediately");
  breaker.recordSuccess();
  assert.equal(breaker.isOpen, false);

  const deadline = new Deadline(1_000, () => now);
  now += 400;
  assert.equal(deadline.remaining(), 600);
  assert.equal(deadline.allows(700), false);
  assert.equal(await withinBudget(sleep(200).then(() => "late"), 20, "fallback"), "fallback");
  assert.equal(await withinBudget(Promise.resolve("fast"), 50, "fallback"), "fast");
  assert.equal(await withinBudget(Promise.resolve("never awaited"), 0, "spent"), "spent");

  const big = new Response("x".repeat(10_000));
  assert.equal((await readTextCapped(big, 1_000)).length, 1_000, "body reads are capped");
  assert.equal(await readTextCapped(new Response("small"), 1_000), "small");
}

function extraction() {
  const html = `
    <html><head><title>Kids &amp; Families &#x2014; Therapy</title></head><body>
    <img src="/assets/logo@2x.png"> <img src="sprite@3x.webp">
    <a href="mailto:Intake%40clinic.org?subject=hi">Email us</a>
    <p>Write to referrals@clinic.org or your@email.com.</p>
    <p>Call (816) 555-2368, 816.555.2368 or +1 913-648-0144. Fax 816-555-0199.</p>
    <p>Order #123-456-7890 and 000-555-1234 and 911-555-1234 are not phones.</p>
    <!-- 314-555-9999 hidden comment --><script>var x="636-555-2222"</script>
    <p>Fees &amp;lt; $50&nbsp;today</p>
    </body></html>`;
  const page = extractPublicPage(html, "https://clinic.org/");
  assert.equal(page.title, "Kids & Families — Therapy");
  assert.deepEqual(page.emails.sort(), ["intake@clinic.org", "referrals@clinic.org"], "asset names and placeholders are not mailboxes");
  assert.deepEqual(page.phones, ["(816) 555-2368", "(913) 648-0144"], "phones are validated and de-duplicated by digits");
  assert.match(page.textSample, /Fees &lt; \$50 today/, "entities decode exactly once");
  assert.doesNotMatch(page.textSample, /314-555-9999|636-555-2222/, "comments and scripts are not page text");

  assert.equal(decodeHtml("&amp;lt;b&amp;gt;"), "&lt;b&gt;");
  assert.equal(decodeHtml("O&#8217;Neil &#x26; Co"), "O’Neil & Co");
  assert.equal(decodeHtml("&bogus; stays"), "&bogus; stays");
  assert.deepEqual(extractEmails('<a href="mailto:a.b%2Bkids@school.k12.mo.us">x</a>'), ["a.b+kids@school.k12.mo.us"]);
  assert.deepEqual(extractPhones("Call 1-800-555-0123 or 314 555 0100"), [], "reserved fictional 555-01xx numbers are dropped");
  assert.deepEqual(extractPhones("Toll free 1 (800) 273-8255"), ["(800) 273-8255"], "country code prefix is normalized");
  assert.deepEqual(extractPhones("Main 314-362-5000; fictional 314-555-0100"), ["(314) 362-5000"]);

  assert.equal(normalizeUrl("https://Example.org/Path/?utm_source=x&id=2&fbclid=abc#top"), "https://example.org/Path?id=2");

  const robots = parseRobots(`User-agent: *\nDisallow: /private\nAllow: /private/open\nDisallow: /*.pdf$\nDisallow: /search*q=\n`);
  assert.equal(isAllowed("/private/x", robots), false);
  assert.equal(isAllowed("/private/open/page", robots), true, "longest match wins");
  assert.equal(isAllowed("/files/report.pdf", robots), false, "wildcard + end anchor");
  assert.equal(isAllowed("/files/report.pdf?v=2", robots), true, "end anchor is exact");
  assert.equal(isAllowed("/search?page=1&q=aba", robots), false, "mid-pattern wildcard");
  assert.equal(isAllowed("/about", robots), true);
  assert.equal(isAllowed("/x", parseRobots("User-agent: *\nAllow: /x\nDisallow: /x\n")), true, "Allow wins ties");

  const ddg = `<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fclinic.org%2Fservices">Clinic</a><a class="result__snippet">ABA</a>
    <a class="result__a" href="https://duckduckgo.com/y.js?ad_domain=x">Ad</a><a class="result__snippet">sponsored</a>
    <a class="result__a" href="https://clinic.org/services/?utm_source=ddg">Clinic again</a><a class="result__snippet">dup</a>`;
  const hits = parseDuckDuckGoHtml(ddg, "aba");
  assert.equal(hits.length, 1, "ads and tracking-parameter duplicates are dropped");
  assert.equal(hits[0].url, "https://clinic.org/services");
  assert.equal(hits[0].rank, 1);
}

async function providerFailover() {
  resetPublicSearchRuntime();
  const calls: string[] = [];
  const rss = (title: string) => `<rss><channel><item><title>${title}</title><link>https://example-clinic.org/${encodeURIComponent(title)}</link><description>ABA therapy</description></item></channel></rss>`;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    if (url.includes("duckduckgo")) return new Response("<div class=\"anomaly-modal\">", { status: 202 });
    if (url.includes("bing.com")) {
      await sleep(10);
      return new Response(rss(new URL(url).searchParams.get("q") ?? "q"), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    const [a, b] = await Promise.all([searchPublicWeb("ABA therapy Joplin", 5), searchPublicWeb("aba   THERAPY joplin", 5)]);
    assert.equal(a[0].sourceId, "bing-rss", "DuckDuckGo 202 anomaly page falls through to Bing RSS");
    assert.deepEqual(a, b, "whitespace/case-equivalent queries coalesce");
    assert.equal(calls.filter((url) => url.includes("bing.com")).length, 1, "one upstream request for coalesced queries");
    await searchPublicWeb("ABA therapy Joplin", 5);
    assert.equal(calls.filter((url) => url.includes("bing.com")).length, 1, "repeat query served from cache");

    await searchPublicWeb("query two", 5);
    await searchPublicWeb("query three", 5);
    const ddgBefore = calls.filter((url) => url.includes("duckduckgo")).length;
    await searchPublicWeb("query four", 5);
    assert.equal(calls.filter((url) => url.includes("duckduckgo")).length, ddgBefore, "open breaker skips the failing provider");
    const stats = publicSearchRuntimeStats();
    assert(stats.providerSkips >= 1);
    assert(stats.providers.find((provider) => provider.id === "duckduckgo-html")?.coolingDown);
  } finally {
    globalThis.fetch = realFetch;
    resetPublicSearchRuntime();
  }
}

async function scoutRunStaysWithinLimit() {
  // Every upstream hangs until its caller's own abort signal fires. Before the concurrent,
  // deadline-bounded pipeline this summed to well over the 60-second serverless limit.
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    if (signal?.aborted) return reject(signal.reason);
    signal?.addEventListener("abort", () => reject(signal.reason ?? new Error("aborted")), { once: true });
  })) as typeof fetch;
  resetPublicSearchRuntime();
  const { POST } = await import("../app/api/intelligence/search/route");
  const started = Date.now();
  try {
    const response = await POST(new Request("http://localhost/api/intelligence/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "pediatric referral sources for autism evaluation", location: "Springfield", state: "MO", engine: "client" }),
    }));
    const elapsed = Date.now() - started;
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true, "a hostile network degrades the answer instead of failing the run");
    assert(elapsed < 55_000, `Scout must answer before the 60s platform limit (took ${elapsed}ms)`);
    assert.equal(typeof body.timing?.elapsedMs, "number");
    assert(Array.isArray(body.timing.truncatedStages));
    assert(body.sourceStatus.every((source: { status: string }) => source.status !== "working"), "no source is left reporting 'working'");
    assert.equal(body.territory.label, "Insufficient Evidence", "no evidence never becomes a score");
    console.log(`  hostile-network Scout run answered in ${(elapsed / 1000).toFixed(1)}s; truncated: ${body.timing.truncatedStages.join(", ") || "none"}`);
  } finally {
    globalThis.fetch = realFetch;
    resetPublicSearchRuntime();
  }
}

await runtimePrimitives();
extraction();
await providerFailover();
await scoutRunStaysWithinLimit();
console.log("Scout runtime: caching, coalescing, failover, extraction, robots and time budget verified.");
process.exit(0);
