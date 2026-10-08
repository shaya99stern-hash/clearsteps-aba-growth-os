import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateResearchRequest } from "@/lib/intelligence/request-policy";
import { buildSearchPlan, type SearchLane } from "@/lib/intelligence/query-planner";
import { enrichPublicWebsite, searchPublicWeb } from "@/lib/intelligence/free-search";
import { resolveSearchHits } from "@/lib/intelligence/entity-resolution";
import { isPublicInstitutionalLead, publicInstitutionLookupQuery, selectOrganizationWebsiteHit, enrichInstitutionalLead } from "@/lib/intelligence/institutional-enrichment";
import { collectPublicPageWithPlaywright, playwrightAvailable } from "@/lib/intelligence/browser-collector";
import { withScoutResearchPersistence } from "@/lib/intelligence/research-persistence";
import { fetchCensusDemographics } from "@/lib/intelligence/official/census-demographics";
import { searchNppesLive, type NppesSearchResult } from "@/lib/intelligence/official/nppes-live";
import {
  mergeStateSourceLeads,
  type StateSourceContribution,
} from "@/lib/intelligence/official/state-source-contribution";
import {
  collectScoutStateSource,
  scoutStateSourceDescriptor,
} from "@/lib/intelligence/official/scout-state-source";
import {
  INDICATOR_CATALOG,
  scoreEngineFromObservations,
  type IndicatorObservation,
  type LeadEngine,
} from "@/lib/intelligence/phase3/indicator-catalog";
import { REGULATORY_RULES, type AbaRole } from "@/lib/intelligence/phase3/regulatory-rules";
import type { ResolvedLead } from "@/lib/intelligence/source-types";
import { scanPublicSignals } from "@/lib/intelligence/signals/public-signal-scan";
import { planWeakSignalFollowups } from "@/lib/intelligence/signals/adaptive-followup";
import { qualifyYouthLead, youthLeadPriority, ageBandSearchQueries, type YouthAgeBand } from "@/lib/intelligence/signals/youth-qualification";
import { buildProviderReviewDossier, providerReviewQuery, providerReviewQueries, isRestrictedReviewSite } from "@/lib/intelligence/signals/provider-reputation";
import { summarizeCompanyReviewEvidence } from "@/lib/intelligence/signals/competitor-reviews";
import { assessOpportunityReliability } from "@/lib/intelligence/score-reliability";
import { buildClientGrowthPlan } from "@/lib/intelligence/client-growth";
import { PUBLIC_SOURCE_CHANNELS, matchedPublicSourceChannels } from "@/lib/intelligence/signals/source-channel-catalog";
import { getStateCountyBundle } from "@/lib/intelligence/joins/collectors";
import { scoutDataJoins, type ScoutDataJoins } from "@/lib/intelligence/joins/scout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SourceState = { source: string; status: "working" | "complete" | "unavailable"; detail: string };

const EMPTY_STATE_CONTRIBUTION: StateSourceContribution = {
  referralHits: [],
  observations: [],
  sourceDetail: null,
};

const requestSchema = z.object({
  query: z.string().trim().min(3).max(1_000),
  location: z.string().trim().max(160).optional().default(""),
  state: z.enum(["MO", "KS", "CO"]).optional().default("MO"),
  engine: z.enum(["client", "rbt", "bcba"]).optional().default("client"),
  ageBand: z.enum(["2-18", "2-5", "6-11", "12-18"]).optional().default("2-18"),
  maxResults: z.coerce.number().int().min(3).max(40).optional().default(18),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid Missouri, Kansas or Colorado research request." }, { status: 400 });
  }

  const { query, location, state, engine, ageBand, maxResults } = parsed.data;
  const policy = evaluateResearchRequest(query);
  if (!policy.allowed) return NextResponse.json({ ok: false, error: policy.reason }, { status: 400 });

  const targetLocation = normalizedTargetLocation(location, state);
  const plan = buildSearchPlan(query, targetLocation, engine, state);
  const stateSourceDescriptor = scoutStateSourceDescriptor(state, engine);
  const sourceStatus: SourceState[] = [
    { source: "U.S. Census population", status: "working", detail: "2025 official exact ages 2–18 county/state CSV, with limited ACS fallback" },
    { source: "CMS NPPES", status: "working", detail: "bounded provider/referral cross-reference; NPI is not licensure" },
    { source: "Public Web Search", status: "working", detail: "fallback discovery and market/hiring signals" },
    { source: "Public Website Enrichment", status: "working", detail: "public contact/service cross-reference" },
  ];
  if (stateSourceDescriptor) {
    sourceStatus.splice(2, 0, {
      source: stateSourceDescriptor.source,
      status: "working",
      detail: stateSourceDescriptor.workingDetail,
    });
  }

  const rows: Array<{
    lane: SearchLane;
    hit: Awaited<ReturnType<typeof searchPublicWeb>>[number];
    enrichment?: Awaited<ReturnType<typeof enrichPublicWebsite>>;
  }> = [];
  const errors: string[] = [];
  const observations: IndicatorObservation[] = [];

  // Statewide county joins run alongside the other collectors (cached per server instance).
  const countyBundle = engine === "client" ? getStateCountyBundle(state) : null;
  countyBundle?.catch(() => undefined);

  const [censusSettled, nppesSettled] = await Promise.allSettled([
    fetchCensusDemographics({ state, location: targetLocation }),
    searchNppesLive({ state, location: targetLocation, engine, perCategory: 12 }),
  ]);

  const census = censusSettled.status === "fulfilled" ? censusSettled.value : null;
  if (census) {
    observations.push(...census.observations);
    completeSource(sourceStatus, "U.S. Census population", census.metrics.ages2to18 != null
      ? census.geographyName + " · exact ages 2–18: " + formatNumber(census.metrics.ages2to18) + " · Census " + census.year
      : census.geographyName + " · ages 3–17 measured; 2 and 18 unavailable · grouped ACS " + census.year);
  } else {
    const detail = censusSettled.status === "rejected"
      ? errorMessage(censusSettled.reason, "Census demographic source failed")
      : "Census demographic source failed";
    unavailableSource(sourceStatus, "U.S. Census population", detail);
    errors.push(`census: ${detail}`);
  }

  const nppes = nppesSettled.status === "fulfilled" ? nppesSettled.value : null;
  if (nppes) {
    observations.push(...observationsFromNppes(nppes));
    if (nppes.successful.length > 0) {
      completeSource(sourceStatus, "CMS NPPES", nppes.successful.length + "/" + nppes.attempted.length +
        " valid taxonomy responses; " + nppes.hits.length + " provider records; NPI does not verify licensure");
    } else {
      unavailableSource(sourceStatus, "CMS NPPES", "All taxonomy requests failed; no provider-density observations counted");
    }
    errors.push(...nppes.errors.map((error) => `nppes: ${error}`));
    if (engine === "client") {
      rows.push(...nppes.hits
        .filter((hit) => hit.sourceId !== "cms-nppes-behavior_analyst")
        .map((hit) => ({ lane: "referral" as const, hit })));
    }
  } else {
    const detail = nppesSettled.status === "rejected"
      ? errorMessage(nppesSettled.reason, "NPPES source failed")
      : "NPPES source failed";
    unavailableSource(sourceStatus, "CMS NPPES", detail);
    errors.push(`nppes: ${detail}`);
  }

  let stateContribution = EMPTY_STATE_CONTRIBUTION;
  if (stateSourceDescriptor) {
    try {
      const stateSource = await collectScoutStateSource({
        state,
        engine,
        location: targetLocation,
        under18Population: census?.metrics.ages2to18 ?? 0, // Only verified exact age cohort; no substitution of under-18 estimates.
      });
      if (stateSource) {
        stateContribution = stateSource.contribution;
        observations.push(...stateContribution.observations);
        if (stateContribution.snapshotOnly) {
          unavailableSource(
            sourceStatus,
            stateSource.descriptor.source,
            stateContribution.sourceDetail ?? "Only historical organizational listings available",
          );
        } else {
          completeSource(
            sourceStatus,
            stateSource.descriptor.source,
            stateContribution.sourceDetail ?? stateSource.descriptor.emptyDetail,
          );
        }
      }
    } catch (error) {
      const detail = errorMessage(error, stateSourceDescriptor.errorFallback);
      unavailableSource(sourceStatus, stateSourceDescriptor.source, detail);
      errors.push(`${stateSourceDescriptor.errorPrefix}: ${detail}`);
    }
  }

  if (engine === "client") {
    const focused = ageBandSearchQueries(ageBand,targetLocation).map((value) =>
      ({ lane:"referral" as const, query:value }));
    plan.queries = [...focused,...plan.queries].slice(0,20);
  }
  const searchQueries = plan.queries.slice(0, 15);
  let queriesAttempted = 0;
  for (let index = 0; index < searchQueries.length; index += 5) {
    const batch = searchQueries.slice(index, index + 5);
    queriesAttempted += batch.length;
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
    // Always execute the bounded public search plan. NPPES hits are registry rows,
    // not searched publisher corroboration; they must never terminate discovery.
  }
  const webHits = rows.filter((row) => row.hit.sourceId === "duckduckgo-html" || row.hit.sourceId === "bing-rss").length;
  if (webHits === 0) {
    unavailableSource(sourceStatus, "Public Web Search", "0 public web results. Search providers returned nothing or were unavailable; do not mistake this for evidence that no services exist.");
    errors.push("public web search: no verified search results from keyless public search providers");
  } else {
    completeSource(sourceStatus, "Public Web Search", webHits + " real public search results from keyless DuckDuckGo or Bing RSS");
  }
  const matchedDomains = matchedPublicSourceChannels(rows.map((row) => row.hit.url));
  sourceStatus.push({
    source: "Public source channel coverage",
    status: matchedDomains.length > 0 ? "complete" : "unavailable",
    detail: PUBLIC_SOURCE_CHANNELS.length + " registered public-source channels; " +
      searchQueries.slice(0, queriesAttempted).filter((item) => item.query.startsWith("site:")).length +
      " site searches scheduled; " + matchedDomains.length +
      " channel domains actually returned results" +
      (matchedDomains.length ? ": " + matchedDomains.slice(0, 7).join(", ") : ""),
  });

  const uniqueForEnrichment = Array.from(
    new Map(rows
      .filter((row) => !row.hit.sourceId.startsWith("cms-nppes-") && !isRestrictedReviewSite(row.hit.url))
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
  const enrichedCount = uniqueForEnrichment.filter((row) => row.enrichment).length;
  if (enrichedCount > 0) {
    completeSource(sourceStatus, "Public Website Enrichment", enrichedCount + " actual public pages enriched");
  } else {
    unavailableSource(sourceStatus, "Public Website Enrichment", "No public pages could be independently enriched; contacts are not verified.");
  }

  const enrichmentByDomain = new Map(uniqueForEnrichment.map((row) => [safeDomain(row.hit.url), row.enrichment]));
  // Public discussion is aggregate context; a forum poster must never become a family-level CRM lead.
  const researchOnlyCommunity = (url: string) => /(^|\.)(reddit\.com|facebook\.com|nextdoor\.com|threads\.net|instagram\.com|tiktok\.com|x\.com)$/i.test(safeDomain(url) ?? "");
  const resolvedPublic = resolveSearchHits(
    rows.filter((row) => !researchOnlyCommunity(row.hit.url) && !isRestrictedReviewSite(row.hit.url)).map((row) => ({
      ...row,
      enrichment: row.enrichment ?? enrichmentByDomain.get(safeDomain(row.hit.url)) ?? null,
    })),
    targetLocation,
  ).slice(0, maxResults);
  const unqualified = mergeStateSourceLeads(resolvedPublic, stateContribution, targetLocation, maxResults);
  // The state registry gives a *name*, not a verified contact. Resolve the top
  // institutional facilities against an independently located organization site.
  // This is a bounded public lookup, never a family, home or personal-review crawl.
  const institutionalCandidates = engine === "client"
    ? unqualified.filter(isPublicInstitutionalLead).slice(0,5) : [];
  const verifiedInstitutions = await Promise.all(institutionalCandidates.map(async (lead)=>{
    try {
      const hits=await searchPublicWeb(publicInstitutionLookupQuery(lead.name,targetLocation),5);
      const matched=selectOrganizationWebsiteHit(lead,hits);
      if (!matched) return lead;
      const site=await enrichPublicWebsite(matched.url);
      return enrichInstitutionalLead(lead,matched,site);
    } catch {
      return lead;
    }
  }));
  const institutionalById=new Map(verifiedInstitutions.map((lead)=>[lead.id,lead]));
  const organizationQualified=unqualified.map((lead)=>institutionalById.get(lead.id)??lead);
  const verifiedInstitutionalWebsites=verifiedInstitutions.filter((lead)=>{
    const original=institutionalCandidates.find((candidate)=>candidate.id===lead.id);
    return Boolean(original&&original.website!==lead.website);
  }).length;
  if(engine==="client")sourceStatus.push({
    source:"Official organization website resolution",
    status:verifiedInstitutionalWebsites?"complete":"unavailable",
    detail:institutionalCandidates.length+" official institutional facilities checked; "+
      verifiedInstitutionalWebsites+" independently matched live organization websites; "+
      verifiedInstitutions.filter((lead)=>lead.phones.length||lead.emails.length).length+
      " with published contacts (not necessarily referral decision-makers)",
  });
  const classified = engine === "client" ? organizationQualified.map((lead) => {
    const fit = qualifyYouthLead(lead,ageBand as YouthAgeBand);
    const documented = fit.ageStatus === "documented";
    const competitor = fit.organizationRole === "aba_competitor";
    return {
      lead: {
        ...lead,
        score: Math.min(lead.score, documented ? competitor ? 30 : 60 : 35),
        confidence: Math.min(lead.confidence, documented ? fit.supportingPublishers >= 2 ? 75 : 55 : 40),
        unknowns: [...lead.unknowns,...fit.missingChecks.filter((item) => !lead.unknowns.includes(item))],
      },
      fit,
    };
  }).filter((item) => item.fit.ageStatus !== "outside")
    .sort((a,b) => youthLeadPriority(b.fit) - youthLeadPriority(a.fit) || b.lead.score - a.lead.score) : [];
  const resolved = engine === "client" ? classified.map((item) => item.lead) : organizationQualified;
  const youthQualifications = Object.fromEntries(classified.map((item) => [item.lead.id,item.fit]));
  if (engine === "client") sourceStatus.push({
    source:"Child age and organization qualification",
    status:classified.some((item) => item.fit.ageStatus === "documented") ? "complete" : "unavailable",
    detail:"Ages " + ageBand + " · " + classified.filter((item) => item.fit.ageStatus === "documented").length +
      " organization age matches documented, " +
      classified.filter((item) => item.fit.organizationRole === "aba_competitor").length +
      " competitor(s), " + classified.filter((item) => item.fit.ageStatus !== "documented").length +
      " research-only candidates; no individual families collected",
  });

  // Review discovery is capped to real named competitor organizations. Do not crawl
  // the reviews themselves or enrich Google/Yelp pages; links are verification-only.
  const competitors = resolved.filter((lead) => providerReviewQuery(lead,targetLocation)).slice(0,3);
  const reputationEntries = await Promise.all(competitors.map(async (lead) => {
    try {
      const queries = providerReviewQueries(lead,targetLocation);
      const gathered = await Promise.allSettled(queries.map((query) => searchPublicWeb(query,4)));
      const hits = gathered.flatMap((result) => result.status === "fulfilled" ? result.value : []);
      return [lead.id,{
        ...buildProviderReviewDossier(lead,hits),
        independentThemes:summarizeCompanyReviewEvidence(lead,hits,targetLocation),
      }] as const;
    } catch {
      return [lead.id,{
        ...buildProviderReviewDossier(lead,[]),
        independentThemes:summarizeCompanyReviewEvidence(lead,[],targetLocation),
      }] as const;
    }
  }));
  const providerReputation = Object.fromEntries(reputationEntries);
  sourceStatus.push({
    source:"Public competitor review discovery",
    status: reputationEntries.some(([,summary]) => summary.reviews.length > 0) ? "complete" : "unavailable",
    detail: competitors.length + " named organizations queried; " +
      reputationEntries.reduce((sum,[,summary]) => sum + summary.reviews.length,0) +
      " review/press URLs indexed, " +
      reputationEntries.filter(([,entry])=>entry.independentThemes.status==="corroborated").length +
      " independent cross-publisher themes (Google/Yelp link-only)",
  });

  // First pass exposes weak institutional clues even if only a single publication exists.
  // Pursue independent cross-checks before computing final market evidence.
  // This does not search for or build dossiers on identifiable children or households.
  const initialSignals = scanPublicSignals(
    rows.map((item)=>item.hit),new Date().toISOString(),targetLocation,
    engine === "client" ? ageBand : "all",
  );
  const followupPlan = planWeakSignalFollowups(
    initialSignals.clues,targetLocation,engine === "client" ? ageBand : "all",
    5,Math.floor(Date.now()/86_400_000),
  );
  const followupResults = await Promise.allSettled(
    followupPlan.map((probe)=>searchPublicWeb(probe.query,4)),
  );
  const followupHits = followupResults.flatMap((result)=>
    result.status === "fulfilled"?result.value:[],
  );
  const followupUniqueUrls=new Set(followupHits.map((hit)=>hit.url)).size;
  const publicSignals = scanPublicSignals(
    [...rows.map((item)=>item.hit),...followupHits],
    new Date().toISOString(),targetLocation,engine === "client" ? ageBand : "all",
  );
  if(followupPlan.length)sourceStatus.push({
    source:"Adaptive weak-clue cross-reference",
    status:followupUniqueUrls>0?"complete":"unavailable",
    detail:followupPlan.length+" unconfirmed public signal hypotheses investigated; "+
      followupUniqueUrls+" additional public result URLs; "+
      (followupResults.filter((item)=>item.status==="rejected").length)+" failed follow-ups; "+
      "independent publisher + published geography + target age still required before scoring",
  });
  observations.push(...publicSignals.observations);
  const clientGrowth = engine === "client" ? buildClientGrowthPlan({
    state,location:targetLocation,ageBand,
    demographics:census ? {geographyName:census.geographyName,geographyKind:census.geographyKind,year:census.year,metrics:census.metrics} : null,
    publicClues:publicSignals.clues,
  }) : null;
  sourceStatus.push({
    source: "Public multi-source signal correlations",
    status: publicSignals.observations.length ? "complete" : "unavailable",
    detail: publicSignals.clues.length + " observed clues, " + publicSignals.observations.length +
      " age-aligned independently supported indicators, " + publicSignals.supportedChecks + "/60 cross-checks",
  });
  let dataJoins: ScoutDataJoins | null = null;
  if (countyBundle) {
    try {
      const joined = scoutDataJoins(await countyBundle, targetLocation);
      dataJoins = joined.dataJoins;
      observations.push(...joined.observations);
      const completePrograms = joined.dataJoins.programs.filter((program) => program.status === "complete").length;
      sourceStatus.push({
        source: "County data joins (40 cross-program)",
        status: joined.dataJoins.status === "county_matched" ? "complete" : "unavailable",
        detail: joined.dataJoins.status === "county_matched" && joined.dataJoins.county
          ? `${joined.dataJoins.county.name}: ${joined.dataJoins.county.computedJoins}/40 joins, rank ${joined.dataJoins.county.rank ?? "—"} of ${joined.dataJoins.county.rankedOf}; ${completePrograms}/${joined.dataJoins.programs.length} statistical programs`
          : joined.dataJoins.note,
      });
    } catch (error) {
      errors.push(`county joins: ${errorMessage(error, "county data joins failed")}`);
    }
  }
  observations.push(...observationsFromResolvedLeads(resolved, engine));
  observations.push(...evidenceQualityObservations(resolved, sourceStatus));
  const dedupedObservations = dedupeObservations(observations);
  const engineScores = {
    client: scoreEngineFromObservations("client", dedupedObservations),
    rbt: scoreEngineFromObservations("rbt", dedupedObservations),
    bcba: scoreEngineFromObservations("bcba", dedupedObservations),
  };
  const independentPublishers = new Set([
    ...rows.map((row) => safeDomain(row.hit.url)).filter((item): item is string => Boolean(item)),
    ...stateContribution.referralHits.map((hit) => safeDomain(hit.url)).filter((item): item is string => Boolean(item)),
  ]).size;
  const scoreReliability = Object.fromEntries(
    (["client", "rbt", "bcba"] as const).map((name) =>
      [name, assessOpportunityReliability(engineScores[name], independentPublishers)]
    )
  ) as Record<LeadEngine, ReturnType<typeof assessOpportunityReliability>>;
  const selectedScore = engineScores[engine];
  const rules = REGULATORY_RULES.filter((rule) => rule.state === state && rule.roles.includes(roleForEngine(engine)));
  const screened = rows.length + stateContribution.referralHits.length;
  const territory = {
    location: census?.geographyName ?? targetLocation,
    total: scoreReliability[engine].displayScore ?? 0,
    label: scoreReliability[engine].label,
    confidence: selectedScore.confidence,
    coverage: selectedScore.coverage,
    reasoning: selectedScore.pillarBreakdown
      .filter((pillar) => pillar.observed > 0)
      .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
      .slice(0, 4)
      .map((pillar) => `${pillar.title}: ${pillar.score}/100 from ${pillar.observed}/${pillar.applicable} indicators`),
  };

  const response = await withScoutResearchPersistence(
    {
      ok: true as const,
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
      screened,
      leads: resolved,
      // These are named public resource organizations for territory context ONLY.
      // They are NOT family inquiries, partners or CRM-ready client contacts.
      communityNetworks: engine === "client" ? stateContribution.communityNetworks ?? [] : [],
      youthQualifications,
      ageBand: engine === "client" ? ageBand : null,
      clientGrowth,
      providerReputation,
      demographics: census ? { geographyName: census.geographyName, geographyKind: census.geographyKind, year: census.year, metrics: census.metrics } : null,
      indicatorSummary: {
        modelTotal: INDICATOR_CATALOG.length,
        observed: dedupedObservations.length,
        selectedApplicable: selectedScore.applicableIndicators,
        selectedObserved: selectedScore.observedIndicators,
        coverage: selectedScore.coverage,
      },
      engineScores,
      scoreReliability,
      publicSignals,
      dataJoins,
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
      territory,
      errors,
    },
    {
      query,
      location: targetLocation,
      state,
      engine,
      plan,
      sourceStatus,
      screened,
      leads: resolved,
      engineScores,
      territory,
      errors,
    },
  );

  return NextResponse.json(response);
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
  const finished = new Set(nppes.successful);
  return [
    ...(finished.has("pediatrics") ? [make("referral-ecosystem.01", nppes.counts.pediatrics, 18)] : []),
    ...(finished.has("developmental_pediatrics") ? [make("referral-ecosystem.02", nppes.counts.developmental_pediatrics, 6)] : []),
    ...(finished.has("child_psychology") ? [make("referral-ecosystem.03", nppes.counts.child_psychology, 10)] : []),
    ...(finished.has("speech") ? [make("referral-ecosystem.05", nppes.counts.speech, 20)] : []),
    ...(finished.has("occupational") ? [make("referral-ecosystem.06", nppes.counts.occupational, 20)] : []),
    // A maximum-12-record NPPES sample cannot establish total ABA supply or scarcity.
    // Retain the raw records as context only; never reverse them into a high-need claim.
  ];
}

function observationsFromResolvedLeads(leads: ResolvedLead[], engine: LeadEngine): IndicatorObservation[] {
  const capturedAt = new Date().toISOString();
  const sourceIds = Array.from(new Set(leads.flatMap((lead) => lead.evidence.map((evidence) => evidence.sourceId))));
  const contactable = leads.filter((lead) => lead.emails.length > 0 || lead.phones.length > 0).length;
  const hiringSignals = leads.filter((lead) => lead.kind === "talent_signal" || lead.signals.includes("hiring"));
  const observations: IndicatorObservation[] = [];

  if (engine === "client" && leads.length > 0) {
    observations.push({ indicatorId: "relationship-quality.01", value: ratioScore(contactable, Math.max(1, leads.length)), confidence: 70, sourceIds, capturedAt });
    observations.push({ indicatorId: "relationship-quality.10", value: scaledCount(leads.reduce((sum, lead) => sum + lead.evidence.length, 0), 30), confidence: 68, sourceIds, capturedAt });
  }
  if (engine === "rbt" && hiringSignals.length > 0) {
    observations.push({ indicatorId: "rbt-workforce.01", value: scaledCount(hiringSignals.length, 12), confidence: 62, sourceIds, capturedAt });
    observations.push({ indicatorId: "rbt-workforce.08", value: scaledCount(new Set(hiringSignals.map((lead) => lead.domain || lead.name)).size, 8), confidence: 60, sourceIds, capturedAt });
  }
  if (engine === "bcba" && hiringSignals.length > 0) {
    observations.push({ indicatorId: "bcba-workforce.01", value: scaledCount(hiringSignals.length, 10), confidence: 62, sourceIds, capturedAt });
    observations.push({ indicatorId: "bcba-workforce.10", value: scaledCount(new Set(hiringSignals.map((lead) => lead.domain || lead.name)).size, 8), confidence: 60, sourceIds, capturedAt });
  }
  return observations;
}

function evidenceQualityObservations(leads: ResolvedLead[], sourceStatus: SourceState[]): IndicatorObservation[] {
  const evidence = leads.flatMap((lead) => lead.evidence);
  if (evidence.length === 0) return []; // No actual evidence is unknown, not an observed zero.
  const publishers = Array.from(new Set(
    evidence.map((item) => safeDomain(item.url)).filter((domain): domain is string => Boolean(domain)),
  ));
  if (publishers.length === 0) return [];
  const sourceIds = publishers;
  const collectionSources = sourceStatus.filter((source) =>
    source.status === "complete" &&
    !["Public source channel coverage", "Public multi-source signal correlations"].includes(source.source),
  ).length;
  const confidence = Math.round(leads.reduce((sum, lead) => sum + lead.confidence, 0) / leads.length);
  const capturedAt = new Date().toISOString();
  return [
    { indicatorId: "evidence-quality.01", value: scaledCount(publishers.length, 8), confidence: 80, sourceIds, capturedAt },
    { indicatorId: "evidence-quality.02", value: scaledCount(collectionSources, 5), confidence: 80, sourceIds, capturedAt },
    // One website, even with 100 identical pages, provides no independent corroboration.
    { indicatorId: "evidence-quality.05", value: publishers.length >= 2 ? scaledCount(publishers.length - 1, 6) : 0, confidence: 82, sourceIds, capturedAt },
    { indicatorId: "evidence-quality.06", value: confidence, confidence: 70, sourceIds, capturedAt },
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

function normalizedTargetLocation(location: string, state: "MO" | "KS" | "CO") {
  const trimmed = location.trim();
  if (!trimmed) return state === "MO" ? "Missouri" : state === "KS" ? "Kansas" : "Colorado";
  if (/\b(MO|Missouri|KS|Kansas|CO|Colorado)\b/i.test(trimmed)) return trimmed;
  return `${trimmed}, ${state}`;
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