import type { LeadEngine } from "../phase3/indicator-catalog";
import type { PublicSearchHit } from "../source-types";

const API_URL = "https://npiregistry.cms.hhs.gov/api/";
const REGISTRY_URL = "https://npiregistry.cms.hhs.gov/provider-view/";

export type NppesCategory = "pediatrics" | "developmental_pediatrics" | "child_psychology" | "speech" | "occupational" | "behavior_analyst";

export interface NppesSearchResult {
  hits: PublicSearchHit[];
  counts: Record<NppesCategory, number>;
  attempted: NppesCategory[];
  errors: string[];
}

type NppesApiResult = {
  number?: string | number;
  enumeration_type?: string;
  basic?: {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    credential?: string;
    organization_name?: string;
    status?: string;
    last_updated?: string;
  };
  addresses?: Array<{
    address_purpose?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    telephone_number?: string;
  }>;
  taxonomies?: Array<{
    code?: string;
    desc?: string;
    primary?: boolean;
    state?: string;
    license?: string;
  }>;
};

type NppesApiResponse = {
  result_count?: number;
  results?: NppesApiResult[];
  Errors?: Array<{ description?: string }>;
};

const CATEGORY_QUERIES: Record<NppesCategory, string> = {
  pediatrics: "Pediatrics",
  developmental_pediatrics: "Developmental - Behavioral Pediatrics",
  child_psychology: "Clinical Child & Adolescent Psychologist",
  speech: "Speech-Language Pathologist",
  occupational: "Occupational Therapist",
  behavior_analyst: "Behavior Analyst",
};

export async function searchNppesLive(input: {
  state: "MO" | "KS";
  location: string;
  engine: LeadEngine;
  perCategory?: number;
}): Promise<NppesSearchResult> {
  const categories = categoriesForEngine(input.engine);
  const counts = emptyCounts();
  const errors: string[] = [];
  const hits: PublicSearchHit[] = [];
  const perCategory = Math.max(3, Math.min(input.perCategory ?? 12, 25));
  const locality = parseLocality(input.location, input.state);

  const batches = await Promise.all(categories.map(async (category) => {
    try {
      const response = await fetchCategory({ category, state: input.state, locality, limit: perCategory });
      return { category, response, error: null as string | null };
    } catch (error) {
      return { category, response: null, error: error instanceof Error ? error.message : "NPPES request failed" };
    }
  }));

  for (const batch of batches) {
    if (batch.error || !batch.response) {
      errors.push(`${batch.category}: ${batch.error ?? "unavailable"}`);
      continue;
    }
    counts[batch.category] = batch.response.results.length;
    hits.push(...batch.response.results.map((result, index) => toSearchHit(result, batch.category, input.state, locality.label, index)));
    errors.push(...batch.response.errors.map((error) => `${batch.category}: ${error}`));
  }

  return { hits: dedupeByNpi(hits), counts, attempted: categories, errors };
}

async function fetchCategory(input: {
  category: NppesCategory;
  state: "MO" | "KS";
  locality: ReturnType<typeof parseLocality>;
  limit: number;
}) {
  const params = new URLSearchParams({
    version: "2.1",
    state: input.state,
    taxonomy_description: CATEGORY_QUERIES[input.category],
    limit: String(input.limit),
  });
  if (input.locality.city) params.set("city", input.locality.city);
  if (input.locality.postalCode) params.set("postal_code", input.locality.postalCode);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { "user-agent": "ClearStepsResearch/1.0 (+bounded public NPPES lookup)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`NPPES returned ${response.status}`);
    const json = await response.json() as NppesApiResponse;
    return parseNppesResponse(json);
  } finally {
    clearTimeout(timer);
  }
}

export function parseNppesResponse(json: NppesApiResponse) {
  const errors = (json.Errors ?? []).map((error) => error.description ?? "NPPES reported an error").filter(Boolean);
  const results = (json.results ?? []).filter((result) => result.number && result.basic?.status !== "D");
  return { results, errors };
}

function toSearchHit(result: NppesApiResult, category: NppesCategory, state: "MO" | "KS", locality: string, index: number): PublicSearchHit {
  const npi = String(result.number ?? "");
  const basic = result.basic ?? {};
  const name = basic.organization_name?.trim() || [basic.first_name, basic.middle_name, basic.last_name, basic.credential].filter(Boolean).join(" ").trim() || `NPI ${npi}`;
  const address = primaryAddress(result.addresses ?? []);
  const taxonomy = primaryTaxonomy(result.taxonomies ?? []);
  const addressText = [address?.address_1, address?.address_2, address?.city, address?.state, address?.postal_code].filter(Boolean).join(", ");
  const taxonomyText = taxonomy?.desc || CATEGORY_QUERIES[category];
  const licenseText = taxonomy?.license ? ` State-license field: ${taxonomy.license}${taxonomy.state ? ` (${taxonomy.state})` : ""}.` : "";
  const phoneText = address?.telephone_number ? ` Phone: ${address.telephone_number}.` : "";

  return {
    title: name,
    url: `${REGISTRY_URL}${encodeURIComponent(npi)}`,
    snippet: `CMS NPPES public record. NPI ${npi}. Taxonomy: ${taxonomyText}. ${addressText ? `Practice address: ${addressText}.` : ""}${phoneText}${licenseText} NPI issuance does not validate state licensure or credentialing.`,
    query: `NPPES ${category.replaceAll("_", " ")} ${locality || state}`,
    sourceId: `cms-nppes-${category}`,
    rank: index + 1,
  };
}

function primaryAddress(addresses: NonNullable<NppesApiResult["addresses"]>) {
  return addresses.find((address) => address.address_purpose === "LOCATION") ?? addresses[0];
}

function primaryTaxonomy(taxonomies: NonNullable<NppesApiResult["taxonomies"]>) {
  return taxonomies.find((taxonomy) => taxonomy.primary) ?? taxonomies[0];
}

function categoriesForEngine(engine: LeadEngine): NppesCategory[] {
  if (engine === "client") return ["pediatrics", "developmental_pediatrics", "child_psychology", "speech", "occupational", "behavior_analyst"];
  return ["behavior_analyst", "developmental_pediatrics", "child_psychology"];
}

function parseLocality(location: string, state: "MO" | "KS") {
  const postalCode = location.match(/\b\d{5}\b/)?.[0];
  const cleaned = location
    .replace(new RegExp(`\\b(${state === "MO" ? "Missouri|MO" : "Kansas|KS"})\\b`, "gi"), "")
    .replace(/\b\d{5}(?:-\d{4})?\b/g, "")
    .replace(/\bcounty\b/gi, "")
    .replace(/[,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const city = cleaned && !/statewide/i.test(cleaned) ? cleaned : undefined;
  return { city, postalCode, label: location.trim() || state };
}

function emptyCounts(): Record<NppesCategory, number> {
  return { pediatrics: 0, developmental_pediatrics: 0, child_psychology: 0, speech: 0, occupational: 0, behavior_analyst: 0 };
}

function dedupeByNpi(hits: PublicSearchHit[]) {
  return Array.from(new Map(hits.map((hit) => [hit.url, hit])).values());
}
