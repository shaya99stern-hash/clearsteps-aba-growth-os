import { NextResponse } from "next/server";
import { getDefaultSearchProvider, getSearchConnectorStatus } from "@/lib/connectors/searchProviders/searchProviderRegistry";
import { SearchProviderError } from "@/lib/connectors/searchProviders/types";
import { buildOpportunities } from "@/lib/discovery/evidence";
import { generateQueries } from "@/lib/discovery/queryFamilies";

export const dynamic = "force-dynamic";

type DiscoveryRequest = {
  location?: string;
  sourceType?: string;
  resultLimit?: number;
  limitPerFamily?: number;
  language?: string;
  country?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as DiscoveryRequest;
  const location = body.location?.trim() ?? "";

  if (!location) {
    return NextResponse.json({
      status: "error",
      error: "A location is required before running live discovery.",
      providerStatus: getSearchConnectorStatus(),
      researchRun: null,
      queries: [],
      opportunities: [],
    }, { status: 400 });
  }

  const provider = getDefaultSearchProvider();
  const queries = generateQueries(location, body.sourceType ?? "all", body.limitPerFamily ?? 2);

  if (!provider.configured) {
    return NextResponse.json({
      status: "provider_not_configured",
      error: "Search provider not configured. Add SERPAPI_API_KEY to run live public web discovery.",
      providerStatus: getSearchConnectorStatus(),
      researchRun: {
        id: `run-${Date.now()}`,
        run_name: `ABA referral discovery: ${location}`,
        location,
        source_type: body.sourceType ?? "all",
        provider: provider.id,
        status: "provider_not_configured",
        results_count: 0,
        errors: ["SERPAPI_API_KEY missing"],
      },
      queries,
      opportunities: [],
    });
  }

  const errors: string[] = [];
  const allResults = [];

  for (const query of queries) {
    try {
      const response = await provider.search({
        query: query.query,
        location,
        limit: Math.min(body.resultLimit ?? 5, 10),
        language: body.language ?? "en",
        country: body.country ?? "us",
      });
      allResults.push(...response.results);
    } catch (error) {
      if (error instanceof SearchProviderError) {
        errors.push(`${query.query}: ${error.message}`);
      } else {
        errors.push(`${query.query}: Unknown provider error`);
      }
    }
  }

  const opportunities = buildOpportunities(allResults, location);

  return NextResponse.json({
    status: errors.length > 0 && opportunities.length === 0 ? "error" : "completed",
    providerStatus: getSearchConnectorStatus(),
    researchRun: {
      id: `run-${Date.now()}`,
      run_name: `ABA referral discovery: ${location}`,
      location,
      source_type: body.sourceType ?? "all",
      provider: provider.id,
      status: errors.length > 0 && opportunities.length === 0 ? "error" : "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      results_count: opportunities.length,
      errors,
    },
    queries,
    opportunities,
    errors,
  });
}
