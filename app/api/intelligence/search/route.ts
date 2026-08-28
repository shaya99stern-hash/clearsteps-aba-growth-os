import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateResearchRequest } from "@/lib/intelligence/request-policy";
import { buildSearchPlan, type SearchLane } from "@/lib/intelligence/query-planner";
import { enrichPublicWebsite, searchPublicWeb } from "@/lib/intelligence/free-search";
import { resolveSearchHits } from "@/lib/intelligence/entity-resolution";
import { collectPublicPageWithPlaywright, playwrightAvailable } from "@/lib/intelligence/browser-collector";
import { fetchCensusDemographics } from "@/lib/intelligence/official/census-demographics";
import { searchNppesLive, type NppesSearchResult } from "@/lib/intelligence/official/nppes-live";
import {
  INDICATOR_CATALOG,
  scoreEngineFromObservations,
  type IndicatorObservation,
  type LeadEngine,
} from "@/lib/intelligence/phase3/indicator-catalog";
import { REGULATORY_RULES, type AbaRole } from "@/lib/intelligence/phase3/regulatory-rules";
import type { ResolvedLead } from "@/lib/intelligence/source-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SourceState = { source: string; status: "working" | "complete" | "unavailable"; detail: string };

const requestSchema = z.object({
  query: z.string().trim().min(3).max(1_000),
  location: z.string().trim().max(160).optional().default(""),
  state: z.enum(["MO", "KS"]).optional().default("MO"),
  engine: z.enum(["client", "rbt", "bcba"]).optional().default("client"),
  maxResults: z.coerce.number().int().min(3).max(40).optional().default(18),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid Missouri/Kansas research request." }, { status: 400 });
  }

  const { query, location, state, engine, maxResults } = parsed.data;
  const policy = evaluateResearchRequest(query);
  if (!policy.allowed) return NextResponse.json({ ok: false, error: policy.reason }, { status: 400 });

  const targetLocation = normalizedTargetLocation(location, state);
  const plan = buildSearchPlan(query, targetLocation, engine);
  const sourceStatus: SourceState[] = [
    { source: "U.S. Census ACS", status: "working", detail: "child population + five-year demographic context" },
    { source: "CMS NPPES", status: "working", detail: "bounded provider/referral cross-reference; NPI is not licensure" },
    { source: "Public Web Search", status: "working", detail: "fallback discovery and market/hiring signals" },
    { source: "Public Website Enrichment", status: "working", detail: "public contact/service cross-reference" },
  ];
  const rows: Array<{
    lane: SearchLane;
    hit: Awaited<ReturnType<typeof searchPublicWeb>>[number];
    enrichment?: Awaited<ReturnType<typeof enrichPublicWebsite>>;
  }> = [];
  const errors: string[] = [];
  const observations: IndicatorObservation[] = [];

  const [censusSettled, nppesSettled] = await Promise.allSettled([
    fetchCensusDemographics({ state, location: targetLocation }),
    searchNppesLive({ state, location: targetLocation, engine, perCategory: 12 }),
  ]);

  const census = censusSettled.status === "fulfilled" ? censusSettled.value : null;
  if (census) {
    observations.push(...census.observations);
    completeSource(sourceStatus, "U.S. Census ACS", `${census.geographyName} · ${formatNumber(census.metrics.under18)} residents under 18 · ACS ${census.year}`);
  } else {
    const detail = errorMessage(censusSettled.reason, "Census demographic source failed");
    unavailableSource(sourceStatus, "U.S. Census ACS", detail);
    errors.push(`census: ${detail}`);
  }

  const nppes = nppesSettled.status === "fulfilled" ? nppesSettled.value : null;
  if (nppes) {
    observations.push(...observationsFromNppes(nppes));
    completeSource(sourceStatus, "CMS NPPES", `${nppes.hits.length} bounded provider records across ${nppes.attempted.length} taxonomy searches`);
    errors.push(...nppes.errors.map((error) => `nppes: ${error}`));
    if (engine === "client") {
      rows.push(...nppes.hits
        .filter((hit) => hit.sourceId !== "cms-nppes-behavior_analyst")
        .map((hit) => ({ lane: "referral" as const, hit })));
    }
  } else {
    const detail = errorMessage(nppesSettled.reason, "NPPES source failed");
    unavailableSource(sourceStatus, "CMS NPPES", detail);
    errors.push(`nppes: ${detail}`);
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
  completeSource(sourceStatus, "Public Web Search", `${rows.filter((row) => row.hit.sourceId === "duckduckgo-html").length} fallback/search result(s) screened`);

  const uniqueForEnrichment = Array.from(
    new Map(rows
      .filter((row) => !row.hit.sourceId.startsWith("cms-nppes-"))
      .map((row) => [safeDomain(row.hit.url) ?? row.hit.url, row])).values(),
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
  completeSource(sourceStatus, "Public Website Enrichment", `${uniqueForEnrichment.filter((row) => row.enrichment).length} public website(s) enriched`);

  const enrichmentByDomain = new Map(uniqueForEnrichment.map((row) => [safeDomain(row.hit.url), row.enrichment]));
  const resolved = resolveSearchHits(
    rows.map((row) => ({
      ...row,
      enrichment: row.enrichment ?? enrichmentByDomain.get(safeDomain(row.hit.url)) ?? null,
    })),
    targetLocation,
  ).slice(0, maxResults);

  observations.push(...observationsFromResolvedLeads(resolved, engine));
  observations.push(...evidenceQualityObservations(resolved, sourceStatus));
  const dedupedObservations = dedupeObservations(observations);
  const engineScores = {
    client: scoreEngineFromObservations("client", dedupedObservations),
    rbt: scoreEngineFromObservations("rbt", dedupedObservations),
    bcba: scoreEngineFromObservations("bcba", dedupedObservations),
  };
  const selectedScore = engineScores[engine];
  const rules = REGULATORY_RULES.filter((rule) => rule.state === state && rule.roles.includes(roleForEngine(engine)));

  return NextResponse.json({
    ok: true,
    state,
    engine,
    plan,
    sourceStatus,
    browser: {
      source: "Playwright Public Browser",
      status: browserReady ? "complete" : "unavailable",
      detail: browserReady
        ? `${browserEnrichments} weak fetch result(s) upgraded with browser rendering`
        : "browser binary unavailable; direct public-source collectors remained active",
    },
    screened: rows.length,
    leads: resolved,
    demographics: census ? { geographyName: census.geographyName, geographyKind: census.geographyKind, year: census.year, metrics: census.metrics } : null,
    indicatorSummary: {
      modelTotal: INDICATOR_CATALOG.length,
      observed: dedupedObservations.length,
      selectedApplicable: selectedScore.applicableIndicators,
      selectedObserved: selectedScore.observedIndicators,
      coverage: selectedScore.coverage,
    },
    engineScores,
    regulatoryRules: rules.map((rule) => ({
      id: rule.id,
      domain: rule.domain,
      title: rule.title,
      summary: rule.summary,
      posture: rule.posture,
      effectiveDate: rule.effectiveDate,
      sourceUrl: rule.sourceUrl,
      sourceLabel: rule.sourceLabel,
    })),
    territory: {
      location: census?.geographyName ?? targetLocation,
      total: selectedScore.score,
      label: scoreLabel(selectedScore.score),
      confidence: selectedScore.confidence,
      coverage: selectedScore.coverage,
      reasoning: selectedScore.pillarBreakdown
        .filter((pillar) => pillar.observed > 0)
        .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
        .slice(0, 4)
        .map((pillar) => `${pillar.title}: ${pillar.score}/100 from ${pillar.observed}/${pillar.applicable} indicators`),
    },
    errors,
  });
}

function observationsFromNppes(nppes: NppesSearchResult): IndicatorObservation[] {
  const sourceIds = ["cms-nppes-live"];
  const capturedAt = new Date().toISOString();
  const make = (indicatorId: string, count: number, strongAt: number, confidence = 80): IndicatorObservation => ({
    indicatorId,
    value: scaledCount(count, strongAt),
    confidence,
    sourceIds,
    capturedAt,
  });
  return [
    make("referral-ecosystem.01", nppes.counts.pediatrics, 18),
    make("referral-ecosystem.02", nppes.counts.developmental_pediatrics, 6),
    make("referral-ecosystem.03", nppes.counts.child_psychology, 10),
    make("referral-ecosystem.05", nppes.counts.speech, 20),
    make("referral-ecosystem.06", nppes.counts.occupational, 20),
    make("aba-supply.01", nppes.counts.behavior_analyst, 25, 72),
  ];
}

function observationsFromResolvedLeads(leads: ResolvedLead[], engine: LeadEngine): IndicatorObservation[] {
  const capturedAt = new Date().toISOString();
  const sourceIds = Array.from(new Set(leads.flatMap((lead) => lead.evidence.map((evidence) => evidence.sourceId))));
  const contactable = leads.filter((lead) => lead.emails.length > 0 || lead.phones.length > 0).length;
  const hiringSignals = leads.filter((lead) => lead.kind === "talent_signal" || lead.signals.includes("hiring"));
  const observations: IndicatorObservation[] = [];

  if (engine === "client") {
    observations.push({ indicatorId: "relationship-quality.01", value: ratioScore(contactable, Math.max(1, leads.length)), confidence: 70, sourceIds, capturedAt });
    observations.push({ indicatorId: "relationship-quality.10", value: scaledCount(leads.reduce((sum, lead) => sum + lead.evidence.length, 0), 30), confidence: 68, sourceIds, capturedAt });
  }
  if (engine === "rbt") {
    observations.push({ indicatorId: "rbt-workforce.01", value: scaledCount(hiringSignals.length, 12), confidence: 62, sourceIds, capturedAt });
    observations.push({ indicatorId: "rbt-workforce.08", value: scaledCount(new Set(hiringSignals.map((lead) => lead.domain || lead.name)).size, 8), confidence: 60, sourceIds, capturedAt });
  }
  if (engine === "bcba") {
    observations.push({ indicatorId: "bcba-workforce.01", value: scaledCount(hiringSignals.length, 10), confidence: 62, sourceIds, capturedAt });
    observations.push({ indicatorId: "bcba-workforce.10", value: scaledCount(new Set(hiringSignals.map((lead) => lead.domain || lead.name)).size, 8), confidence: 60, sourceIds, capturedAt });
  }
  return observations;
}

function evidenceQualityObservations(leads: ResolvedLead[], sourceStatus: SourceState[]): IndicatorObservation[] {
  const evidence = leads.flatMap((lead) => lead.evidence);
  const sourceIds = Array.from(new Set(evidence.map((item) => item.sourceId)));
  const workingSources = sourceStatus.filter((source) => source.status === "complete").length;
  const confidence = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.confidence, 0) / leads.length) : 0;
  const capturedAt = new Date().toISOString();
  return [
    { indicatorId: "evidence-quality.01", value: scaledCount(sourceIds.length, 8), confidence: 90, sourceIds, capturedAt },
    { indicatorId: "evidence-quality.02", value: scaledCount(workingSources, 5), confidence: 90, sourceIds, capturedAt },
    { indicatorId: "evidence-quality.05", value: evidence.length ? 92 : 0, confidence: 90, sourceIds, capturedAt },
    { indicatorId: "evidence-quality.06", value: confidence, confidence: 80, sourceIds, capturedAt },
  ];
}

function dedupeObservations(observations: IndicatorObservation[]) {
  const grouped = new Map<string, IndicatorObservation[]>();
  for (const observation of observations) {
    const current = grouped.get(observation.indicatorId) ?? [];
    current.push(observation);
    grouped.set(observation.indicatorId, current);
  }
  return [...grouped.entries()].map(([indicatorId, items]) => ({
    indicatorId,
    value: Math.round(items.reduce((sum, item) => sum + item.value, 0) / items.length),
    confidence: Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length),
    sourceIds: Array.from(new Set(items.flatMap((item) => item.sourceIds))),
    capturedAt: items.map((item) => item.capturedAt).filter(Boolean).sort().at(-1),
  }));
}

function roleForEngine(engine: LeadEngine): AbaRole {
  if (engine === "rbt") return "rbt";
  if (engine === "bcba") return "bcba";
  return "client";
}

function normalizedTargetLocation(location: string, state: "MO" | "KS") {
  const trimmed = location.trim();
  if (!trimmed) return state === "MO" ? "Missouri" : "Kansas";
  if (/\b(MO|Missouri|KS|Kansas)\b/i.test(trimmed)) return trimmed;
  return `${trimmed}, ${state}`;
}

function scoreLabel(score: number) {
  return score >= 80 ? "Very High" : score >= 65 ? "High" : score >= 45 ? "Moderate" : score > 0 ? "Early Signal" : "Insufficient Evidence";
}

function scaledCount(value: number, strongAt: number) {
  if (value <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.log1p(value) / Math.log1p(strongAt)) * 100)));
}

function ratioScore(numerator: number, denominator: number) {
  return Math.max(0, Math.min(100, Math.round((numerator / Math.max(1, denominator)) * 100)));
}

function completeSource(sources: SourceState[], name: string, detail: string) {
  const source = sources.find((item) => item.source === name);
  if (source) Object.assign(source, { status: "complete" as const, detail });
}

function unavailableSource(sources: SourceState[], name: string, detail: string) {
  const source = sources.find((item) => item.source === name);
  if (source) Object.assign(source, { status: "unavailable" as const, detail });
}

function errorMessage(value: unknown, fallback: string) {
  return value instanceof Error ? value.message : fallback;
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
