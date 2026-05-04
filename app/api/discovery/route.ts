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

function buildSearchQueries(leadType: string, cityOrZip: string, state: string, excludeCompetitors: boolean) {
  const location = `${cityOrZip}, ${state}`;
  const base = `${leadType} ${location}`;
  const queries = [base];

  if (leadType.includes("daycare") || leadType.includes("preschool")) {
    queries.push(`child care center ${location}`, `early childhood center ${location}`, `inclusive preschool ${location}`);
  }

  if (leadType.includes("speech")) {
    queries.push(`pediatric speech therapy ${location}`, `children speech delay therapy ${location}`);
  }

  if (leadType.includes("occupational")) {
    queries.push(`pediatric occupational therapy ${location}`, `sensory processing occupational therapy ${location}`);
  }

  if (leadType.includes("psychologist") || leadType.includes("evaluator") || leadType.includes("neuropsych")) {
    queries.push(`autism evaluation children ${location}`, `child psychologist autism testing ${location}`);
  }

  if (leadType.includes("pediatrician")) {
    queries.push(`pediatric clinic ${location}`, `developmental screening pediatrician ${location}`);
  }

  if (leadType.includes("community")) {
    queries.push(`autism resources ${location}`, `special needs parent resources ${location}`, `family resource center ${location}`);
  }

  if (!excludeCompetitors) {
    queries.push(`ABA therapy provider ${location}`, `BCBA RBT hiring ${location}`);
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

  const location = `${cityOrZip}, ${state}`;
  const queries = buildSearchQueries(leadType ?? "", cityOrZip ?? "", state ?? "", Boolean(body.excludeCompetitors));
  const allResults: NormalizedSearchResult[] = [];
  const providerErrors: string[] = [];
  const perQueryLimit = Math.min(10, Math.max(3, Math.ceil(maxResults / Math.max(queries.length, 1))));

  for (const query of queries) {
    if (allResults.length >= maxResults) break;
    try {
      const response = await provider.search({
        query,
        location,
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
  let opportunities = buildOpportunities(uniqueResults, location);

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
