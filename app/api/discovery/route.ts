import { NextResponse } from "next/server";
import { getDefaultSearchProvider } from "@/lib/connectors/searchProviders/searchProviderRegistry";
import { SearchProviderError } from "@/lib/connectors/searchProviders/types";
import { buildOpportunities } from "@/lib/discovery/evidence";
import type { NormalizedSearchResult } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

type DiscoveryBody = {
  state?: string;
  cityOrZip?: string;
  leadType?: string;
  maxResults?: number;
  radiusMiles?: number;
  excludeCompetitors?: boolean;
};

function isZip(value: string) {
  return /^\d{5}$/.test(value.trim());
}

function buildSearchQueries(leadType: string, cityOrZip: string, state: string, radiusMiles: number, excludeCompetitors: boolean) {
  const location = `${cityOrZip}, ${state}`;
  const radiusText = `within ${radiusMiles} miles`;
  const base = `${leadType} near ${location} ${radiusText}`;
  const queries = [base];

  if (leadType.includes("daycare") || leadType.includes("preschool")) {
    queries.push(
      `child care center near ${location} ${radiusText}`,
      `early childhood center near ${location} ${radiusText}`,
      `inclusive preschool near ${location} ${radiusText}`,
    );
  }

  if (leadType.includes("speech")) {
    queries.push(`pediatric speech therapy near ${location} ${radiusText}`, `children speech delay therapy near ${location} ${radiusText}`);
  }

  if (leadType.includes("occupational")) {
    queries.push(`pediatric occupational therapy near ${location} ${radiusText}`, `sensory processing occupational therapy near ${location} ${radiusText}`);
  }

  if (leadType.includes("psychologist") || leadType.includes("evaluator") || leadType.includes("neuropsych")) {
    queries.push(`autism evaluation children near ${location} ${radiusText}`, `child psychologist autism testing near ${location} ${radiusText}`);
  }

  if (leadType.includes("pediatrician")) {
    queries.push(`pediatric clinic near ${location} ${radiusText}`, `developmental screening pediatrician near ${location} ${radiusText}`);
  }

  if (leadType.includes("community")) {
    queries.push(`autism resources near ${location} ${radiusText}`, `special needs parent resources near ${location} ${radiusText}`, `family resource center near ${location} ${radiusText}`);
  }

  if (!excludeCompetitors) {
    queries.push(`ABA therapy provider near ${location} ${radiusText}`, `BCBA RBT hiring near ${location} ${radiusText}`);
  }

  return Array.from(new Set(queries));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as DiscoveryBody;
  const state = body.state?.trim();
  const cityOrZip = body.cityOrZip?.trim();
  const leadType = body.leadType?.trim();
  const maxResults = Number(body.maxResults ?? 10);
  const radiusMiles = Number(body.radiusMiles ?? 15);

  const errors: string[] = [];
  if (!state || !["NJ", "MO"].includes(state)) errors.push("State is required and must be NJ or MO.");
  if (!cityOrZip) errors.push("City or ZIP is required.");
  if (!leadType) errors.push("Lead type is required.");
  if (!Number.isFinite(maxResults) || maxResults < 1 || maxResults > 50) errors.push("Max results must be between 1 and 50.");
  if (!Number.isFinite(radiusMiles) || radiusMiles < 1 || radiusMiles > 100) errors.push("Radius must be between 1 and 100 miles.");

  const provider = getDefaultSearchProvider();
  const serpapiConfigured = provider.configured;

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, serpapiConfigured, error: errors.join(" ") }, { status: 400 });
  }

  if (!serpapiConfigured) {
    return NextResponse.json({
      ok: false,
      serpapiConfigured,
      error: "SERPAPI_API_KEY is not configured. Add it in Vercel to enable live discovery.",
      request: { state, cityOrZip, leadType, maxResults, radiusMiles, excludeCompetitors: Boolean(body.excludeCompetitors) },
      leads: [],
    }, { status: 503 });
  }

  const displayLocation = `${cityOrZip}, ${state}`;
  const searchLocation = isZip(cityOrZip ?? "") ? undefined : `${cityOrZip}, ${state}, United States`;
  const queries = buildSearchQueries(leadType ?? "", cityOrZip ?? "", state ?? "", radiusMiles, Boolean(body.excludeCompetitors));
  const allResults: NormalizedSearchResult[] = [];
  const providerErrors: string[] = [];
  const perQueryLimit = Math.min(10, Math.max(3, Math.ceil(maxResults / Math.max(queries.length, 1))));

  for (const query of queries) {
    if (allResults.length >= maxResults) break;
    try {
      const response = await provider.search({
        query,
        location: searchLocation,
        limit: perQueryLimit,
        language: "en",
        country: "us",
      });
      allResults.push(...response.results);
    } catch (error) {
      if (error instanceof SearchProviderError) {
        providerErrors.push(`${query}: ${error.message}`);
      } else {
        providerErrors.push(`${query}: unknown provider error`);
      }
    }
  }

  const uniqueResults = Array.from(new Map(allResults.map((result) => [result.url, result])).values()).slice(0, maxResults);
  let opportunities = buildOpportunities(uniqueResults, displayLocation);

  if (body.excludeCompetitors) {
    opportunities = opportunities.filter((item) => item.classification !== "Competitor / Market Signal");
  }

  return NextResponse.json({
    ok: true,
    serpapiConfigured,
    status: "completed",
    message: opportunities.length > 0 ? `Found ${opportunities.length} real public web results. Review evidence before outreach.` : "Live search completed but no qualifying results were returned.",
    request: { state, cityOrZip, leadType, maxResults, radiusMiles, excludeCompetitors: Boolean(body.excludeCompetitors) },
    queries,
    providerErrors,
    leads: opportunities,
  });
}
