import { NextResponse } from "next/server";
import { buildSearchPlan } from "@/lib/intelligence/query-planner";
import { enrichPublicWebsite, searchPublicWeb } from "@/lib/intelligence/free-search";
import { resolveSearchHits } from "@/lib/intelligence/entity-resolution";
import { inferTerritorySignals, scoreTerritory } from "@/lib/intelligence/territory-score";
import { playwrightAvailable } from "@/lib/intelligence/browser-collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    location?: string;
    maxResults?: number;
  };
  const query = body.query?.trim();
  const location = body.location?.trim() ?? "";
  const maxResults = Math.max(3, Math.min(Number(body.maxResults ?? 18), 40));
  if (!query || query.length < 3) {
    return NextResponse.json({ ok: false, error: "Enter a research request." }, { status: 400 });
  }

  const plan = buildSearchPlan(query, location);
  const sourceStatus = [
    { source: "Public Web Search", status: "working" as const, detail: "API-key-free HTML search" },
    { source: "Public Website Enrichment", status: "working" as const, detail: "contact/service cross-reference" },
    { source: "Community Signal Scan", status: "working" as const, detail: "territory-level public signals only" },
  ];

  const rows: Array<{
    lane: (typeof plan.queries)[number]["lane"];
    hit: Awaited<ReturnType<typeof searchPublicWeb>>[number];
    enrichment?: Awaited<ReturnType<typeof enrichPublicWebsite>>;
  }> = [];
  const errors: string[] = [];

  for (const planQuery of plan.queries) {
    try {
      const hits = await searchPublicWeb(planQuery.query, 5);
      rows.push(...hits.map((hit) => ({ lane: planQuery.lane, hit })));
      if (rows.length >= maxResults * 3) break;
    } catch (error) {
      errors.push(`${planQuery.lane}: ${error instanceof Error ? error.message : "search failed"}`);
    }
  }

  const uniqueForEnrichment = Array.from(
    new Map(rows.map((row) => [safeDomain(row.hit.url) ?? row.hit.url, row])).values(),
  ).slice(0, 10);

  await Promise.all(uniqueForEnrichment.map(async (row) => {
    row.enrichment = await enrichPublicWebsite(row.hit.url);
  }));

  const enrichmentByDomain = new Map(uniqueForEnrichment.map((row) => [safeDomain(row.hit.url), row.enrichment]));
  const resolved = resolveSearchHits(
    rows.map((row) => ({
      ...row,
      enrichment: row.enrichment ?? enrichmentByDomain.get(safeDomain(row.hit.url)) ?? null,
    })),
    location,
  ).slice(0, maxResults);

  const signals = inferTerritorySignals(resolved);
  const territory = scoreTerritory(signals);
  const browserReady = await playwrightAvailable();

  return NextResponse.json({
    ok: true,
    plan,
    sourceStatus: sourceStatus.map((source) => ({ ...source, status: "complete" })),
    browser: {
      source: "Playwright Public Browser",
      status: browserReady ? "complete" : "unavailable",
      detail: browserReady ? "runtime available" : "optional runtime not installed; fetch collectors used",
    },
    screened: rows.length,
    leads: resolved,
    territory: { location: location || "Unspecified territory", signals, ...territory },
    errors,
  });
}

function safeDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}
