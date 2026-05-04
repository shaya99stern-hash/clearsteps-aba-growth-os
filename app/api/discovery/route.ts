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

type SerpMapsResult = {
  position?: number;
  title?: string;
  address?: string;
  phone?: string;
  website?: string;
  place_id?: string;
  rating?: number;
  reviews?: number;
  type?: string;
  types?: string[];
  gps_coordinates?: { latitude?: number; longitude?: number };
  hours?: string;
  description?: string;
  thumbnail?: string;
  service_options?: Record<string, unknown>;
};

type LocalLead = {
  id: string;
  name: string;
  classification: string;
  source_type: string;
  business_name?: string;
  address?: string;
  phone?: string;
  website?: string;
  maps_place_id?: string;
  rating?: number;
  reviews?: number;
  best_contact_role: string;
  contact_status: string;
  evidence_url?: string;
  evidence_title?: string;
  evidence_snippet?: string;
  short_reason: string;
  detected_signals: string[];
  evidence_confidence: string;
  verification_status: string;
  score_breakdown: Record<string, number>;
  opportunity_score: {
    total: number;
    classification: string;
    breakdown: Record<string, number>;
    reasoning: string[];
  };
  recommendation: {
    recommended_action: string;
    reason: string;
  };
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

function bestContactRole(leadType: string) {
  if (leadType.includes("daycare") || leadType.includes("preschool")) return "Director / owner / administrator";
  if (leadType.includes("speech") || leadType.includes("occupational")) return "Clinic owner / clinical director / office manager";
  if (leadType.includes("psychologist") || leadType.includes("evaluator") || leadType.includes("neuropsych")) return "Practice manager / evaluator / clinical director";
  if (leadType.includes("pediatrician")) return "Office manager / referral coordinator / physician owner";
  if (leadType.includes("community")) return "Program director / family services coordinator";
  if (leadType.includes("competitor")) return "Do not outreach as referral lead";
  return "Director / office manager";
}

function classifyLead(leadType: string, result: SerpMapsResult) {
  const text = `${leadType} ${result.title ?? ""} ${result.type ?? ""} ${(result.types ?? []).join(" ")}`.toLowerCase();
  if (text.includes("aba") || text.includes("applied behavior") || text.includes("bcba") || text.includes("rbt")) return "Competitor / Market Signal";
  if (leadType.includes("competitor")) return "Competitor / Market Signal";
  return "Referral Source";
}

function scoreLocalLead(params: { classification: string; result: SerpMapsResult; leadType: string }) {
  const { classification, result, leadType } = params;
  const competitor = classification === "Competitor / Market Signal";
  const referralAccess = competitor ? 0 : 18;
  const needSignal = leadType.includes("autism") || leadType.includes("evaluator") || leadType.includes("psychologist") ? 14 : 8;
  const nonCompetitor = competitor ? 0 : 15;
  const contactability = (result.phone ? 7 : 0) + (result.website ? 5 : 0) + (result.address ? 3 : 0);
  const crossReferenceStrength = result.reviews ? Math.min(10, Math.floor(result.reviews / 20) + 3) : 3;
  const localServiceAreaFit = result.address ? 10 : 6;
  const payorFit = 0;
  const evidenceConfidence = result.title && (result.phone || result.website || result.address) ? 5 : 2;
  const breakdown = { referralAccess, needSignal, nonCompetitor, contactability, crossReferenceStrength, localServiceAreaFit, payorFit, evidenceConfidence };
  let total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  if (competitor) total = Math.min(total, 45);
  const label = competitor ? "Competitor / Market Signal" : total >= 70 ? "Ready for Outreach" : total >= 55 ? "Needs Enrichment" : total >= 40 ? "Research Further" : "Low Priority";
  return { total, classification: label, breakdown };
}

async function searchGoogleMaps(params: { apiKey: string; query: string; limit: number }) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_maps");
  url.searchParams.set("q", params.query);
  url.searchParams.set("api_key", params.apiKey);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  url.searchParams.set("type", "search");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`SerpAPI Maps request failed with status ${response.status}`);
  const data = (await response.json()) as { local_results?: SerpMapsResult[]; error?: string };
  if (data.error) throw new Error(data.error);
  return (data.local_results ?? []).slice(0, params.limit);
}

function mapsResultToLead(result: SerpMapsResult, leadType: string, query: string): LocalLead {
  const classification = classifyLead(leadType, result);
  const score = scoreLocalLead({ classification, result, leadType });
  const detectedSignals = [leadType, result.type, ...(result.types ?? [])].filter(Boolean) as string[];
  const reasonParts = [
    result.phone ? "phone found" : "phone missing",
    result.website ? "website found" : "website missing",
    result.address ? "address found" : "address missing",
  ];

  return {
    id: `maps-${result.place_id ?? result.position ?? result.title}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    name: result.title ?? "Unnamed organization",
    business_name: result.title,
    classification,
    source_type: "Google Maps local result",
    address: result.address,
    phone: result.phone,
    website: result.website,
    maps_place_id: result.place_id,
    rating: result.rating,
    reviews: result.reviews,
    best_contact_role: bestContactRole(leadType),
    contact_status: result.phone || result.website ? "Contactable — verify decision-maker" : "Missing phone/website — enrich before outreach",
    evidence_url: result.website,
    evidence_title: result.title,
    evidence_snippet: `${result.title ?? "Organization"}${result.address ? ` at ${result.address}` : ""}${result.phone ? `, phone ${result.phone}` : ""}${result.rating ? `, rating ${result.rating}` : ""}. Query: ${query}`,
    short_reason: `${classification === "Referral Source" ? "Local organization result" : "Market signal"}; ${reasonParts.join(", ")}.`,
    detected_signals: detectedSignals,
    evidence_confidence: result.phone || result.website || result.address ? "Medium" : "Low",
    verification_status: "needs_review",
    score_breakdown: score.breakdown,
    opportunity_score: {
      ...score,
      reasoning: [
        "Referral Access: based on whether this is a likely referral-source organization rather than a direct ABA competitor.",
        "Need Signal: based on lead type and whether the searched category touches children/autism/developmental concerns.",
        "Contactability: based on phone, website, and address returned by Google Maps local data.",
        "Cross-reference strength: based on public local-result review footprint. This is not a quality endorsement.",
        "Payor Fit: zero until real insurance/payor evidence is added.",
      ],
    },
    recommendation: {
      recommended_action: classification === "Competitor / Market Signal" ? "Save as market intelligence. Do not contact as referral lead." : `Verify ${bestContactRole(leadType)} and prepare a short referral-resource introduction.`,
      reason: "Recommendation is based on public local business evidence and the selected lead type. It is not based on private family or child data.",
    },
  };
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
  const apiKey = process.env.SERPAPI_API_KEY;

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, serpapiConfigured, error: errors.join(" ") }, { status: 400 });
  }

  if (!serpapiConfigured || !apiKey) {
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
  const providerErrors: string[] = [];
  const mapLeads: LocalLead[] = [];

  for (const query of queries) {
    if (mapLeads.length >= maxResults) break;
    try {
      const mapsResults = await searchGoogleMaps({ apiKey, query, limit: Math.min(10, maxResults) });
      mapLeads.push(...mapsResults.map((result) => mapsResultToLead(result, leadType ?? "", query)));
    } catch (error) {
      providerErrors.push(`${query}: ${error instanceof Error ? error.message : "unknown Google Maps provider error"}`);
    }
  }

  const uniqueMapLeads = Array.from(new Map(mapLeads.map((lead) => [lead.maps_place_id ?? `${lead.name}-${lead.address}`, lead])).values());
  let leads: Array<LocalLead | ReturnType<typeof buildOpportunities>[number]> = uniqueMapLeads.slice(0, maxResults);

  if (body.excludeCompetitors) {
    leads = leads.filter((item) => item.classification !== "Competitor / Market Signal");
  }

  if (leads.length === 0) {
    const allResults: NormalizedSearchResult[] = [];
    const perQueryLimit = Math.min(10, Math.max(3, Math.ceil(maxResults / Math.max(queries.length, 1))));
    for (const query of queries) {
      if (allResults.length >= maxResults) break;
      try {
        const response = await provider.search({ query, location: searchLocation, limit: perQueryLimit, language: "en", country: "us" });
        allResults.push(...response.results);
      } catch (error) {
        if (error instanceof SearchProviderError) providerErrors.push(`${query}: ${error.message}`);
        else providerErrors.push(`${query}: unknown organic provider error`);
      }
    }
    const uniqueResults = Array.from(new Map(allResults.map((result) => [result.url, result])).values()).slice(0, maxResults);
    leads = buildOpportunities(uniqueResults, displayLocation);
    if (body.excludeCompetitors) leads = leads.filter((item) => item.classification !== "Competitor / Market Signal");
  }

  return NextResponse.json({
    ok: true,
    serpapiConfigured,
    status: "completed",
    message: leads.length > 0 ? `Found ${leads.length} real public local/web results. Review evidence before outreach.` : "Live search completed but no qualifying results were returned.",
    request: { state, cityOrZip, leadType, maxResults, radiusMiles, excludeCompetitors: Boolean(body.excludeCompetitors) },
    queries,
    providerErrors,
    leads,
  });
}
