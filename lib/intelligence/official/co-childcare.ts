import type { IndicatorObservation } from "../phase3/indicator-catalog";
import type { PublicSearchHit } from "../source-types";

export const COLORADO_CHILDCARE_DATASET = "https://data.colorado.gov/Early-childhood/Colorado-Licensed-Child-Care-Facilities-Report/a9rr-k8mu";
const API = "https://data.colorado.gov/resource/a9rr-k8mu.json";
export const COLORADO_CHILDCARE_SOURCE = "co-cdec-licensed-childcare";

export interface ColoradoChildCareFacility {
  id: string; name: string; kind: string; city: string; county: string;
  zip?: string; capacity?: number; sourceUrl: string;
}
type SocrataRow = {
  provider_id?: string | number; provider_name?: string;
  provider_service_type?: string; city?: string; county?: string;
  state?: string; zip?: string | number; total_licensed_capacity?: string | number;
};
function norm(value: unknown) { return String(value ?? "").trim(); }
function safeLocation(value: string) {
  return value.replace(/\b(Colorado|CO)\b/gi, "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
}
export function coloradoWhere(location: string) {
  const clean = safeLocation(location);
  const postcode = clean.match(/\b\d{5}\b/)?.[0];
  if (postcode) return "zip = " + Number(postcode);
  const county = /\bcounty\b/i.test(clean) ? clean.replace(/\bcounty\b/gi, "").trim() : null;
  if (!clean || /^statewide$/i.test(clean)) return "state = 'CO'";
  const target = (county ?? clean).replace(/[^A-Za-z0-9 -]/g, "").toUpperCase().replace(/'/g, "''");
  return "state = 'CO' AND upper(" + (county ? "county" : "city") + ") = '" + target + "'";
}
export function parseColoradoChildCare(rows: unknown): ColoradoChildCareFacility[] {
  if (!Array.isArray(rows)) throw new Error("CDEC public dataset returned an invalid response.");
  const unique = new Map<string, ColoradoChildCareFacility>();
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as SocrataRow;
    const name = norm(row.provider_name);
    const kind = norm(row.provider_service_type);
    // Licensed home-based child care may be conducted at a residence. Exclude.
    if (!name || !/center|preschool|school age|school-age|youth organization/i.test(kind)) continue;
    if (/family child care home|infant.*home|large child care home|experienced child care provider/i.test(kind)) continue;
    if (norm(row.state).toUpperCase() !== "CO") continue;
    const id = norm(row.provider_id);
    if (!id) continue;
    const capacity = Number(row.total_licensed_capacity);
    unique.set(id, {
      id, name: name.slice(0, 160), kind,
      city: norm(row.city).slice(0, 100),
      county: norm(row.county).slice(0, 100),
      zip: norm(row.zip).slice(0, 5) || undefined,
      capacity: Number.isFinite(capacity) && capacity >= 0 ? capacity : undefined,
      sourceUrl: COLORADO_CHILDCARE_DATASET,
    });
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export async function searchColoradoChildCare(location: string, limit = 120): Promise<ColoradoChildCareFacility[]> {
  const params = new URLSearchParams({
    "$where": coloradoWhere(location),
    "$limit": String(Math.max(1, Math.min(limit, 200))),
    "$order": "provider_name ASC",
    "$select": "provider_id,provider_name,provider_service_type,city,county,state,zip,total_licensed_capacity",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(API + "?" + params.toString(), {
      headers: { accept: "application/json" },
      signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) throw new Error("Colorado CDEC dataset HTTP " + response.status);
    return parseColoradoChildCare(await response.json());
  } finally { clearTimeout(timer); }
}
export function coloradoChildCareToSearchHits(providers: readonly ColoradoChildCareFacility[], location: string): PublicSearchHit[] {
  return providers.map((entry, index) => ({
    title: entry.name,
    url: entry.sourceUrl,
    snippet: "Official CDEC licensed " + entry.kind + "; " + entry.city + ", " + entry.county +
      " County; " + (entry.capacity === undefined ? "capacity unavailable" : "licensed capacity " + entry.capacity) +
      "; facility listing is not evidence of ABA demand.",
    query: "CDEC licensed child care " + location + "; license " + entry.id,
    sourceId: COLORADO_CHILDCARE_SOURCE,
    rank: index + 1,
  }));
}
export function coloradoChildCareObservations(
  providers: readonly ColoradoChildCareFacility[], childPopulation: number, isBoundedGeography: boolean,
): IndicatorObservation[] {
  if (!isBoundedGeography || !Number.isFinite(childPopulation) || childPopulation <= 0) return [];
  const perTenThousand = providers.length / (childPopulation / 10_000);
  return [{
    indicatorId: "referral-ecosystem.07",
    value: Math.min(100, Math.max(0, Math.round(perTenThousand / 20 * 100))),
    confidence: 80, sourceIds: [COLORADO_CHILDCARE_SOURCE], capturedAt: new Date().toISOString(),
  }];
}
