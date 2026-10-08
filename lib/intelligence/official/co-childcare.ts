import type { IndicatorObservation } from "../phase3/indicator-catalog";
import type { PublicSearchHit } from "../source-types";

export const COLORADO_CHILDCARE_DATASET = "https://data.colorado.gov/Early-childhood/Colorado-Licensed-Child-Care-Facilities-Report/a9rr-k8mu";
const API = "https://data.colorado.gov/resource/a9rr-k8mu.json";
export const COLORADO_CHILDCARE_SOURCE = "co-cdec-licensed-childcare";

export interface ColoradoChildCareFacility {
  id: string; name: string; kind: string; city: string; county: string;
  zip?: string; capacity?: number; resourceReferral?: string; earlyChildhoodCouncil?: string; schoolDistrictOperated?: boolean; sourceUrl: string;
}
type SocrataRow = {
  provider_id?: string | number; provider_name?: string;
  provider_service_type?: string; city?: string; county?: string;
  state?: string; zip?: string | number; total_licensed_capacity?: string | number;
  ccrr?: string; ecc?: string; school_district_operated_program?: boolean | string;
};
function norm(value: unknown) { return String(value ?? "").trim(); }
/** Ignore missing/placeholder entries and any person-like or residential field. */
function safePublicOrganization(value: unknown):string|undefined {
  const text=norm(value).slice(0,130);
  if(!text || /^(none|na|n\/a|not applicable|unknown|no ccrr|no ecc|not assigned|unavailable)$/i.test(text))return undefined;
  if(/(?:@|https?:|\d{3}[- .]\d{3}[- .]\d{4}|^\s*\d+\s+[a-z]|\b\d+\s+(?:st|ave|road|drive|street)\b)/i.test(text))return undefined;
  return text;
}
function safeLocation(value: string) {
  return value.replace(/\b(Colorado|CO)\b/gi, "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
}
export function coloradoWhere(location: string) {
  const clean = safeLocation(location);
  const postcode = clean.match(/\b\d{5}\b/)?.[0];
  if (postcode) return "zip = '" + postcode + "'";
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
      resourceReferral: safePublicOrganization(row.ccrr),
      earlyChildhoodCouncil: safePublicOrganization(row.ecc),
      schoolDistrictOperated: row.school_district_operated_program === true ||
        String(row.school_district_operated_program).toLowerCase() === "true",
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
    "$select": "provider_id,provider_name,provider_service_type,city,county,state,zip,total_licensed_capacity,ccrr,ecc,school_district_operated_program",
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
/** Official agency relationship clues: CCRR and local councils, not patient-level referrals.
 * Repeated affiliations count as ONE organization. All retain the same CDEC publisher.
 */
export function coloradoPublicReferralNetworkHits(providers: readonly ColoradoChildCareFacility[], location:string): PublicSearchHit[] {
  const organizations=new Map<string,{name:string;category:"Child Care Resource & Referral"|"Early Childhood Council";cities:Set<string>;facilities:number}>();
  for(const facility of providers) {
    for(const entry of [
      {name:facility.resourceReferral,category:"Child Care Resource & Referral" as const},
      {name:facility.earlyChildhoodCouncil,category:"Early Childhood Council" as const},
    ]) {
      if(!entry.name)continue;
      const key=entry.category+":"+entry.name.toLowerCase().replace(/[^a-z0-9]/g,"");
      const existing=organizations.get(key)??{name:entry.name,category:entry.category,cities:new Set<string>(),facilities:0};
      existing.facilities++;
      if(facility.city)existing.cities.add(facility.city);
      organizations.set(key,existing);
    }
  }
  return [...organizations.values()].sort((a,b)=>b.facilities-a.facilities)
    .slice(0,30).map((item,index)=>({
      title:item.name,
      url:COLORADO_CHILDCARE_DATASET,
      snippet:"Official Colorado CDEC listing identifies this institutional " + item.category +
        " affiliated with " + item.facilities + " observed licensed nonresidential facility listings"+
        (item.cities.size?" in "+[...item.cities].slice(0,3).join(", "):"")+
        ". Geographic coverage and affiliation require verification. This is not evidence of ABA demand or an active clinical referral relationship.",
      query:"CDEC institutional "+item.category+" "+location+"; organization "+item.name,
      sourceId:"co-cdec-referral-network",
      rank:index+1,
    }));
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
