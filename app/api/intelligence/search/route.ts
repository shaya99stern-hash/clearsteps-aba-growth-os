import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateResearchRequest } from "@/lib/intelligence/request-policy";
import { buildSearchPlan } from "@/lib/intelligence/query-planner";
import { enrichPublicWebsite, searchPublicWeb } from "@/lib/intelligence/free-search";
import { resolveSearchHits } from "@/lib/intelligence/entity-resolution";
import { inferTerritorySignals, scoreTerritory } from "@/lib/intelligence/territory-score";
import { collectPublicPageWithPlaywright, playwrightAvailable } from "@/lib/intelligence/browser-collector";
import { searchNjChildCare } from "@/lib/intelligence/official/nj-childcare";

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
  const policy = evaluateResearchRequest(query);
  if (!policy.allowed) return NextResponse.json({ ok: false, error: policy.reason }, { status: 400 });
  const plan = buildSearchPlan(query, location);
  const sourceStatus: Array<{ source: string; status: "working" | "complete" | "unavailable"; detail: string }> = [
    { source: "Public Web Search", status: "working", detail: "API-key-free HTML search" },
    { source: "Public Website Enrichment", status: "working", detail: "contact/service cross-reference" },
    { source: "Community Signal Scan", status: "working", detail: "territory-level public signals only" },
  ];

  const rows: Array<{
    lane: (typeof plan.queries)[number]["lane"];
    hit: Awaited<ReturnType<typeof searchPublicWeb>>[number];
    enrichment?: Awaited<ReturnType<typeof enrichPublicWebsite>>;
  }> = [];
  const errors: string[] = [];

  if (isNewJerseyTarget(query, location)) {
    try {
      const childcareHits = await searchNjChildCare(location || query, Math.min(maxResults, 30));
      rows.push(...childcareHits.map((hit) => ({ lane: "referral" as const, hit })));
      sourceStatus.push({
        source: "NJ Licensed Child Care",
        status: "complete",
        detail: `${childcareHits.length} official DCF open-data matches`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "NJ licensed child-care source failed";
      errors.push(`referral: ${message}`);
      sourceStatus.push({ source: "NJ Licensed Child Care", status: "unavailable", detail: message });
    }
  }

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
  const browserReady = await playwrightAvailable();
  let browserEnrichments = 0;

  await Promise.all(uniqueForEnrichment.map(async (row) => {
    row.enrichment = await enrichPublicWebsite(row.hit.url);
    if (!browserReady || !needsBrowserEnrichment(row.enrichment)) return;
    try {
      row.enrichment = await collectPublicPageWithPlaywright(row.hit.url);
      browserEnrichments += 1;
    } catch (error) {
      errors.push(`browser enrichment: ${error instanceof Error ? error.message : "failed"}`);
    }
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

  return NextResponse.json({
    ok: true,
    plan,
    sourceStatus: sourceStatus.map((source) => source.status === "working" ? { ...source, status: "complete" as const } : source),
    browser: {
      source: "Playwright Public Browser",
      status: browserReady ? "complete" : "unavailable",
      detail: browserReady
        ? `${browserEnrichments} weak fetch result(s) upgraded with browser rendering`
        : "browser binary unavailable; fetch/download collectors used",
    },
    screened: rows.length,
    leads: resolved,
    territory: { location: location || "Unspecified territory", signals, ...territory },
    errors,
  });
}

function needsBrowserEnrichment(enrichment: Awaited<ReturnType<typeof enrichPublicWebsite>>) {
  if (!enrichment) return true;
  return enrichment.emails.length === 0 && enrichment.phones.length === 0 && enrichment.textSample.length < 600;
}

function safeDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function isNewJerseyTarget(query: string, location: string) {
  return /\b(NJ|New Jersey)\b/i.test(`${location} ${query}`);
}
