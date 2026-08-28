import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSearchPlan } from "@/lib/intelligence/query-planner";
import { enrichPublicWebsite, searchPublicWeb } from "@/lib/intelligence/free-search";
import { resolveSearchHits } from "@/lib/intelligence/entity-resolution";
import { inferTerritorySignals, scoreTerritory } from "@/lib/intelligence/territory-score";
import { playwrightAvailable } from "@/lib/intelligence/browser-collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = z.object({
    query: z.string().trim().min(3).max(1_000),
    location: z.string().trim().max(160).optional().default(""),
    maxResults: z.coerce.number().int().min(3).max(40).optional().default(18),
  }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid research request and location." }, { status: 400 });
  }
  const { query, location, maxResults } = parsed.data;
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

  const searchQueries = plan.queries.slice(0, 10);
  for (let index = 0; index < searchQueries.length; index += 3) {
    const batch = searchQueries.slice(index, index + 3);
    const results = await Promise.all(batch.map(async (planQuery) => {
      try {
        return { planQuery, hits: await searchPublicWeb(planQuery.query, 5), error: null as string | null };
      } catch (error) {
        return { planQuery, hits: [], error: error instanceof Error ? error.message : "search failed" };
      }
    }));
    for (const result of results) {
      if (result.error) errors.push(`${result.planQuery.lane}: ${result.error}`);
      rows.push(...result.hits.map((hit) => ({ lane: result.planQuery.lane, hit })));
    }
    if (rows.length >= maxResults * 3) break;
  }

  const uniqueForEnrichment = Array.from(
    new Map(rows.map((row) => [safeDomain(row.hit.url) ?? row.hit.url, row])).values(),
  ).slice(0, 6);

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
