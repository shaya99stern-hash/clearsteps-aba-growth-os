import { MISSOURI_CHILD_CARE_LAYER_URL } from "../official/mo-child-care-gis";
import { defaultFetchText, errorText, isRecord, parseCsv, upperKeys, type FetchText } from "../joins/collectors";
import type { JoinState } from "../joins/sources";
import type { EnrichedWebsite } from "../source-types";
import { boundsAround, haversineMiles, isValidPoint, MAX_SITE_RADIUS, type LatLon } from "./geo-math";

/**
 * Organization-level places for the map: licensed child care, ABA provider organizations,
 * pediatric practices, therapy offices, schools and hospitals.
 *
 * Privacy rules enforced here:
 *  - Only organizations/facilities are pinned. Individual NPPES clinicians are aggregated to ZIP counts,
 *    because an individual's "practice location" can be a home address.
 *  - OpenStreetMap features are limited to facility tags (childcare, school, hospital, clinic, therapist offices).
 *  - Nothing here locates, infers or represents a child, family or household.
 */
export type PlaceKind = "aba_provider" | "daycare" | "pediatrics" | "therapy" | "school" | "hospital";

export interface MapPlace {
  id: string;
  kind: PlaceKind;
  name: string;
  lat: number;
  lon: number;
  /** Placed at a ZIP centroid because the address could not be geocoded. */
  approximate: boolean;
  address?: string;
  city?: string;
  zip?: string;
  phone?: string;
  website?: string;
  sources: string[];
  licensed?: boolean;
  capacity?: number;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  schoolDistrictOperated?: boolean;
  inclusionSignals: string[];
  distanceMiles?: number;
}

export interface ZipProviderCount {
  zip: string; lat: number; lon: number;
  behaviorAnalysts: number; pediatricClinicians: number;
}

export interface PlaceSourceStatus { source: string; status: "complete" | "unavailable" | "not_applicable"; detail: string }

export interface SitePlaces {
  center: LatLon;
  radiusMiles: number;
  places: MapPlace[];
  zipCounts: ZipProviderCount[];
  sources: PlaceSourceStatus[];
}

export type PostText = (url: string, body: FormData | string, signal: AbortSignal, contentType?: string) => Promise<string>;
export interface PlaceDeps {
  fetchText?: FetchText;
  postText?: PostText;
  enrichWebsite?: (url: string) => Promise<EnrichedWebsite | null>;
  timeoutMs?: number;
  /** Max daycare websites checked for inclusion language per site. */
  websiteChecks?: number;
}

const ZCTA_SERVICE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer";
const NPPES_API = "https://npiregistry.cms.hhs.gov/api/";
const GEOCODER_BATCH = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const COLORADO_CHILDCARE_API = "https://data.colorado.gov/resource/a9rr-k8mu.json";
const MAX_ZIPS = 30;

export const INCLUSION_PATTERN = /\b(inclusi(?:ve|on)|special needs|special education|early intervention|developmental(?:ly)?|autism|autistic|therapeutic|IEP|IFSP|ECSE|early childhood special|sensory|speech therapy|occupational therapy|behavior(?:al)? support|ABA)\b/gi;
const ABA_NAME = /\b(aba|autism|autistic|applied behavior|behavior(?:al)? (?:analysis|therapy|analyst))\b/i;

// ---------------------------------------------------------------------------
// Pure parsers
// ---------------------------------------------------------------------------

export function zctaLayerId(serviceJson: unknown): number | null {
  if (!isRecord(serviceJson) || !Array.isArray(serviceJson.layers)) return null;
  const layers = serviceJson.layers.filter((layer): layer is { id: number; name: string } =>
    isRecord(layer) && typeof layer.id === "number" && typeof layer.name === "string" && /zip code tabulation areas$/i.test(layer.name.trim()));
  // Prefer the most recent vintage (e.g. "2020 Census ZIP Code Tabulation Areas").
  layers.sort((a, b) => b.name.localeCompare(a.name));
  return layers[0]?.id ?? null;
}

export function parseZctaCentroids(payload: unknown): Array<{ zip: string; lat: number; lon: number }> {
  if (!isRecord(payload) || !Array.isArray(payload.features)) throw new Error("ZCTA query returned no features");
  return payload.features.flatMap((feature) => {
    if (!isRecord(feature) || !isRecord(feature.attributes)) return [];
    const a = upperKeys(feature.attributes);
    const zip = String(a.ZCTA5 ?? a.GEOID ?? a.BASENAME ?? "");
    const lat = Number(a.CENTLAT ?? a.INTPTLAT);
    const lon = Number(a.CENTLON ?? a.INTPTLON);
    return /^\d{5}$/.test(zip) && Number.isFinite(lat) && Number.isFinite(lon) ? [{ zip, lat, lon }] : [];
  });
}

/** Parses Missouri DHSS licensed-care age text such as "6 WKS", "2 YRS 6 MOS", "12". */
export function parseAgeYears(text: unknown): number | null {
  if (typeof text === "number") return Number.isFinite(text) && text >= 0 && text <= 21 ? text : null;
  if (typeof text !== "string" || !text.trim()) return null;
  const value = text.toLowerCase();
  let years = 0;
  let matched = false;
  for (const [, n, unit] of value.matchAll(/(\d+(?:\.\d+)?)\s*(y(?:ea)?rs?|y|mo(?:nth)?s?|m|w(?:ee)?ks?|w)\b/g)) {
    matched = true;
    const num = Number(n);
    if (unit.startsWith("y")) years += num;
    else if (unit.startsWith("m")) years += num / 12;
    else years += num / 52;
  }
  if (matched) return Math.round(years * 100) / 100;
  const plain = Number(value.trim());
  return Number.isFinite(plain) && plain >= 0 && plain <= 21 ? plain : null;
}

export function inclusionSignals(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(INCLUSION_PATTERN)) found.add(match[0].toLowerCase());
  return [...found].slice(0, 6);
}

export function parseMissouriChildCarePlaces(payload: unknown): MapPlace[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) throw new Error("Missouri child-care GIS returned no features");
  const out: MapPlace[] = [];
  for (const feature of payload.features) {
    if (!isRecord(feature) || !isRecord(feature.attributes)) continue;
    const a = upperKeys(feature.attributes);
    const name = typeof a.FACILITY === "string" ? a.FACILITY.trim() : "";
    const status = typeof a.STATUS === "string" ? a.STATUS : "";
    if (!name || /\b(closed|inactive|revoked|expired|suspended|terminated)\b/i.test(status)) continue;
    const geometry = isRecord(feature.geometry) ? feature.geometry : {};
    const lat = Number(a.LATITUDE ?? geometry.y);
    const lon = Number(a.LONGITUDE ?? geometry.x);
    if (!isValidPoint({ lat, lon })) continue;
    const capacity = Number(a.TOTAL);
    out.push({
      id: "mo-cc-" + String(a.DVN ?? a.OBJECTID ?? name),
      kind: "daycare", name: titleCase(name), lat, lon, approximate: false,
      address: text(a.ADDRESS), city: titleCase(text(a.CITY) ?? ""), zip: text(a.ZIP)?.slice(0, 5), phone: text(a.PHONE),
      sources: ["mo-dhss-child-care-gis"], licensed: true,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : undefined,
      minAgeYears: parseAgeYears(a.MIN_AGE), maxAgeYears: parseAgeYears(a.MAX_AGE),
      inclusionSignals: inclusionSignals(name + " " + (text(a.SITE_TYPE) ?? "")),
    });
  }
  return out;
}

export function parseColoradoChildCarePlaces(rows: unknown, zipCentroids: ReadonlyMap<string, LatLon>): MapPlace[] {
  if (!Array.isArray(rows)) throw new Error("Colorado child-care dataset returned no rows");
  const out: MapPlace[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const name = text(row.provider_name);
    const zip = text(row.zip)?.slice(0, 5);
    if (!name || !zip) continue;
    const location = isRecord(row.location) && Array.isArray(row.location.coordinates) ? row.location.coordinates : null;
    let lat = Number(row.latitude ?? (location ? location[1] : NaN));
    let lon = Number(row.longitude ?? (location ? location[0] : NaN));
    let approximate = false;
    if (!isValidPoint({ lat, lon })) {
      const centroid = zipCentroids.get(zip);
      if (!centroid) continue;
      ({ lat, lon } = centroid);
      approximate = true;
    }
    const capacity = Number(row.total_licensed_capacity);
    const district = row.school_district_operated_program === true || String(row.school_district_operated_program).toLowerCase() === "true";
    const serviceType = text(row.provider_service_type) ?? "";
    out.push({
      id: "co-cc-" + (text(row.provider_id) ?? name + zip),
      kind: "daycare", name, lat, lon, approximate,
      address: text(row.street_address ?? row.address), city: text(row.city), zip,
      sources: ["co-cdec-licensed-childcare"], licensed: true,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : undefined,
      minAgeYears: null, maxAgeYears: null, schoolDistrictOperated: district,
      inclusionSignals: [
        ...inclusionSignals(name + " " + serviceType),
        ...(district ? ["school-district operated"] : []),
      ],
    });
  }
  return out;
}

export function parseOverpassPlaces(payload: unknown): MapPlace[] {
  if (!isRecord(payload) || !Array.isArray(payload.elements)) throw new Error("Overpass returned no elements");
  const out: MapPlace[] = [];
  for (const element of payload.elements) {
    if (!isRecord(element) || !isRecord(element.tags)) continue;
    const tags = element.tags as Record<string, string>;
    const name = tags.name?.trim();
    if (!name) continue;
    // Facility tags only; anything mapped as a dwelling is never used.
    if (/^(house|residential|apartments|detached|semidetached_house)$/.test(tags.building ?? "")) continue;
    const center = isRecord(element.center) ? element.center : element;
    const lat = Number(center.lat);
    const lon = Number(center.lon);
    if (!isValidPoint({ lat, lon })) continue;
    const amenity = tags.amenity ?? "";
    const healthcare = tags.healthcare ?? "";
    const speciality = (tags["healthcare:speciality"] ?? "") + " " + (tags.description ?? "");
    let kind: PlaceKind | null = null;
    if (ABA_NAME.test(name) || /autism|behavio/i.test(speciality)) kind = "aba_provider";
    else if (amenity === "childcare" || amenity === "kindergarten") kind = "daycare";
    else if (/paediatric|pediatric/i.test(speciality) || /pediatric|paediatric|children'?s clinic/i.test(name)) kind = "pediatrics";
    else if (/speech_therapist|occupational_therapist|physiotherapist/.test(healthcare)) kind = "therapy";
    else if (amenity === "school") kind = "school";
    else if (amenity === "hospital") kind = "hospital";
    if (!kind) continue;
    out.push({
      id: `osm-${element.type}-${element.id}`, kind, name, lat, lon, approximate: false,
      address: [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || undefined,
      city: tags["addr:city"], zip: tags["addr:postcode"]?.slice(0, 5), phone: tags.phone ?? tags["contact:phone"],
      website: tags.website ?? tags["contact:website"], sources: ["openstreetmap"], licensed: false,
      capacity: Number(tags.capacity) > 0 ? Number(tags.capacity) : undefined,
      minAgeYears: tags.min_age ? Number(tags.min_age) : null, maxAgeYears: tags.max_age ? Number(tags.max_age) : null,
      inclusionSignals: kind === "daycare" ? inclusionSignals(name + " " + (tags.description ?? "")) : [],
    });
  }
  return out;
}

type NppesResult = {
  number?: string | number; enumeration_type?: string;
  basic?: { organization_name?: string; status?: string };
  addresses?: Array<{ address_purpose?: string; address_1?: string; city?: string; state?: string; postal_code?: string; telephone_number?: string }>;
};

export function parseNppesZip(json: unknown): { organizations: Array<{ npi: string; name: string; address: string; city: string; state: string; zip: string; phone?: string }>; individuals: number } {
  if (!isRecord(json) || (json.result_count === undefined && !Array.isArray(json.results))) throw new Error("NPPES response missing result_count");
  if (Array.isArray(json.Errors) && json.Errors.length) throw new Error("NPPES rejected the request");
  const organizations: Array<{ npi: string; name: string; address: string; city: string; state: string; zip: string; phone?: string }> = [];
  let individuals = 0;
  for (const result of (json.results ?? []) as NppesResult[]) {
    if (!result.number || result.basic?.status === "D") continue;
    if (result.enumeration_type === "NPI-2") {
      const location = result.addresses?.find((address) => address.address_purpose === "LOCATION") ?? result.addresses?.[0];
      if (!location?.address_1 || !result.basic?.organization_name) continue;
      organizations.push({
        npi: String(result.number), name: result.basic.organization_name, address: location.address_1,
        city: location.city ?? "", state: location.state ?? "", zip: (location.postal_code ?? "").slice(0, 5),
        phone: location.telephone_number,
      });
    } else individuals++;
  }
  return { organizations, individuals };
}

/** Census batch geocoder CSV: "id","input","Match","Exact","matched address","lon,lat",... */
export function parseGeocoderBatch(csv: string): Map<string, LatLon> {
  const out = new Map<string, LatLon>();
  for (const row of parseCsv(csv)) {
    if (row[2] !== "Match" || !row[5]) continue;
    const [lon, lat] = row[5].split(",").map(Number);
    if (isValidPoint({ lat, lon })) out.set(row[0], { lat, lon });
  }
  return out;
}

function tokens(name: string) {
  return new Set(name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((token) => token.length > 2 && !/^(the|and|inc|llc|center|centre|learning|child|care|childcare|daycare|academy|school)$/.test(token)));
}

/** Same organization in two sources: close together and sharing distinctive name words. */
export function samePlace(a: MapPlace, b: MapPlace): boolean {
  if (a.kind !== b.kind) return false;
  if (haversineMiles(a, b) > (a.approximate || b.approximate ? 1.5 : 0.25)) return false;
  const ta = tokens(a.name), tb = tokens(b.name);
  if (!ta.size || !tb.size) return a.name.toLowerCase() === b.name.toLowerCase();
  const shared = [...ta].filter((token) => tb.has(token)).length;
  return shared / Math.min(ta.size, tb.size) >= 0.5;
}

export function mergePlaces(places: readonly MapPlace[]): MapPlace[] {
  const merged: MapPlace[] = [];
  // Licensed/first-party records first so they are the surviving record.
  const ordered = [...places].sort((a, b) => Number(b.licensed ?? false) - Number(a.licensed ?? false) || Number(a.approximate) - Number(b.approximate));
  for (const place of ordered) {
    const existing = merged.find((item) => samePlace(item, place));
    if (!existing) { merged.push({ ...place, sources: [...place.sources], inclusionSignals: [...place.inclusionSignals] }); continue; }
    existing.sources = [...new Set([...existing.sources, ...place.sources])];
    existing.inclusionSignals = [...new Set([...existing.inclusionSignals, ...place.inclusionSignals])];
    existing.website ??= place.website;
    existing.phone ??= place.phone;
    existing.capacity ??= place.capacity;
    if (existing.approximate && !place.approximate) { existing.lat = place.lat; existing.lon = place.lon; existing.approximate = false; }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

const defaultPostText: PostText = async (url, body, signal, contentType) => {
  const response = await fetch(url, {
    method: "POST", body, signal, cache: "no-store",
    headers: { "user-agent": "ClearStepsResearch/1.0 (+public facility map)", ...(contentType ? { "content-type": contentType } : {}) },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

async function limited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = { status: "fulfilled", value: await fn(items[index]) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  }));
  return results;
}

export async function collectSitePlaces(state: JoinState, center: LatLon, deps: PlaceDeps = {}): Promise<SitePlaces> {
  const fetchText = deps.fetchText ?? defaultFetchText;
  const postText = deps.postText ?? defaultPostText;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 28_000);
  const signal = controller.signal;
  const get = (url: string) => fetchText(url, signal);
  const radius = MAX_SITE_RADIUS;
  const box = boundsAround(center, radius + 0.5);
  const envelope = { geometry: `${box.west},${box.south},${box.east},${box.north}`, geometryType: "esriGeometryEnvelope", inSR: "4326", spatialRel: "esriSpatialRelIntersects" };
  const sources: PlaceSourceStatus[] = [];
  const places: MapPlace[] = [];

  // 1. ZIP (ZCTA) centroids around the site — used for NPPES lookups and approximate placement.
  const zctaTask = (async () => {
    let layer: number | null = null;
    try { layer = zctaLayerId(JSON.parse(await get(`${ZCTA_SERVICE}?f=json`))); } catch { /* fall through */ }
    if (layer === null) throw new Error("ZCTA layer not found");
    const params = new URLSearchParams({ ...envelope, outFields: "ZCTA5,GEOID,CENTLAT,CENTLON", returnGeometry: "false", f: "json" });
    return parseZctaCentroids(JSON.parse(await get(`${ZCTA_SERVICE}/${layer}/query?${params.toString()}`)))
      .map((item) => ({ ...item, distance: haversineMiles(center, item) }))
      .filter((item) => item.distance <= radius + 2)
      .sort((a, b) => a.distance - b.distance);
  })();

  // 2. Licensed child-care rosters.
  const rosterTask = (async (): Promise<MapPlace[] | null> => {
    if (state === "MO") {
      const params = new URLSearchParams({
        ...envelope, f: "json", where: "STATE = 'MO'", outSR: "4326", returnGeometry: "true", resultRecordCount: "2000",
        outFields: "OBJECTID,SITE_TYPE,STATUS,FACILITY,DVN,ADDRESS,CITY,STATE,ZIP,COUNTY,PHONE,MIN_AGE,MAX_AGE,TOTAL,LATITUDE,LONGITUDE",
      });
      return parseMissouriChildCarePlaces(JSON.parse(await get(`${MISSOURI_CHILD_CARE_LAYER_URL}/query?${params.toString()}`)));
    }
    if (state === "CO") {
      const zctas = await zctaTask;
      const zips = zctas.slice(0, 60).map((item) => item.zip);
      if (!zips.length) return [];
      const params = new URLSearchParams({ $where: `state = 'CO' AND zip in (${zips.map((zip) => `'${zip}'`).join(",")})`, $limit: "2000" });
      return parseColoradoChildCarePlaces(JSON.parse(await get(`${COLORADO_CHILDCARE_API}?${params.toString()}`)), new Map(zctas.map((item) => [item.zip, item])));
    }
    return null;
  })();

  // 3. OpenStreetMap facilities (second, independent source for child care; schools, hospitals, therapy offices).
  const osmTask = (async () => {
    const m = Math.round(radius * 1609.34);
    const around = `(around:${m},${center.lat.toFixed(5)},${center.lon.toFixed(5)})`;
    const query = `[out:json][timeout:20];(` +
      `nwr${around}["amenity"~"^(childcare|kindergarten|school|hospital|doctors|clinic)$"];` +
      `nwr${around}["healthcare"~"^(speech_therapist|occupational_therapist|psychotherapist|counselling|physiotherapist)$"];` +
      `);out center tags 1500;`;
    return parseOverpassPlaces(JSON.parse(await postText(OVERPASS, "data=" + encodeURIComponent(query), signal, "application/x-www-form-urlencoded")));
  })();

  // 4. NPPES by ZIP: behavior-analyst and pediatric ORGANIZATIONS become pins; individuals are only counted.
  const nppesTask = (async () => {
    const zctas = (await zctaTask).slice(0, MAX_ZIPS);
    const jobs = zctas.flatMap((zcta) => (["Behavior Analyst", "Pediatrics"] as const).map((taxonomy) => ({ zcta, taxonomy })));
    const results = await limited(jobs, 6, async ({ zcta, taxonomy }) => {
      const params = new URLSearchParams({ version: "2.1", postal_code: zcta.zip, taxonomy_description: taxonomy, address_purpose: "LOCATION", limit: "200" });
      return { zcta, taxonomy, parsed: parseNppesZip(JSON.parse(await get(`${NPPES_API}?${params.toString()}`))) };
    });
    const counts = new Map<string, ZipProviderCount>();
    const organizations: Array<{ kind: PlaceKind; npi: string; name: string; address: string; city: string; state: string; zip: string; phone?: string; zcta: LatLon }> = [];
    let failed = 0;
    for (const result of results) {
      if (result.status !== "fulfilled") { failed++; continue; }
      const { zcta, taxonomy, parsed } = result.value;
      const entry = counts.get(zcta.zip) ?? { zip: zcta.zip, lat: zcta.lat, lon: zcta.lon, behaviorAnalysts: 0, pediatricClinicians: 0 };
      if (taxonomy === "Behavior Analyst") entry.behaviorAnalysts += parsed.individuals;
      else entry.pediatricClinicians += parsed.individuals;
      counts.set(zcta.zip, entry);
      for (const org of parsed.organizations) organizations.push({ ...org, kind: taxonomy === "Behavior Analyst" ? "aba_provider" : "pediatrics", zcta });
    }
    if (results.length && failed === results.length) throw new Error("all NPPES ZIP lookups failed");
    return { counts: [...counts.values()], organizations, failed, zips: zctas.length, total: jobs.length };
  })();

  const [zctaR, rosterR, osmR, nppesR] = await Promise.allSettled([zctaTask, rosterTask, osmTask, nppesTask]);

  sources.push(zctaR.status === "fulfilled"
    ? { source: "Census ZIP code areas (TIGERweb)", status: "complete", detail: `${zctaR.value.length} ZIP areas within ${radius + 2} miles` }
    : { source: "Census ZIP code areas (TIGERweb)", status: "unavailable", detail: errorText(zctaR.reason) });

  const rosterLabel = state === "MO" ? "Missouri DHSS licensed child care" : state === "CO" ? "Colorado CDEC licensed child care" : "State licensed child-care roster";
  if (rosterR.status === "fulfilled" && rosterR.value) {
    places.push(...rosterR.value);
    sources.push({ source: rosterLabel, status: "complete", detail: `${rosterR.value.length} licensed facilities${rosterR.value.some((p) => p.approximate) ? " (some placed at ZIP centroid)" : ""}` });
  } else if (rosterR.status === "fulfilled") {
    sources.push({ source: rosterLabel, status: "not_applicable", detail: `No statewide licensed child-care roster with locations is integrated for ${state}; OpenStreetMap child-care listings are shown as unconfirmed.` });
  } else sources.push({ source: rosterLabel, status: "unavailable", detail: errorText(rosterR.reason) });

  if (osmR.status === "fulfilled") {
    places.push(...osmR.value);
    sources.push({ source: "OpenStreetMap facilities", status: "complete", detail: `${osmR.value.length} named facilities (child care, schools, hospitals, therapy, ABA-named)` });
  } else sources.push({ source: "OpenStreetMap facilities", status: "unavailable", detail: errorText(osmR.reason) });

  let zipCounts: ZipProviderCount[] = [];
  if (nppesR.status === "fulfilled") {
    zipCounts = nppesR.value.counts;
    // Geocode organization addresses in one Census batch call; fall back to the ZIP centroid.
    let coords = new Map<string, LatLon>();
    const orgs = nppesR.value.organizations;
    const unique = [...new Map(orgs.map((org) => [org.kind + org.npi, org])).values()];
    if (unique.length) {
      try {
        const csv = unique.map((org) => [org.kind + org.npi, org.address, org.city, org.state, org.zip].map((v) => `"${String(v).replace(/"/g, "'")}"`).join(",")).join("\n");
        const form = new FormData();
        form.set("addressFile", new Blob([csv], { type: "text/csv" }), "addresses.csv");
        form.set("benchmark", "Public_AR_Current");
        coords = parseGeocoderBatch(await postText(GEOCODER_BATCH, form, signal));
        sources.push({ source: "Census geocoder", status: "complete", detail: `${coords.size}/${unique.length} provider organization addresses matched` });
      } catch (error) {
        sources.push({ source: "Census geocoder", status: "unavailable", detail: errorText(error) + "; providers placed at ZIP centroids" });
      }
    }
    for (const org of unique) {
      const point = coords.get(org.kind + org.npi);
      places.push({
        id: `npi-${org.npi}`, kind: org.kind, name: titleCase(org.name), lat: point?.lat ?? org.zcta.lat, lon: point?.lon ?? org.zcta.lon,
        approximate: !point, address: org.address, city: titleCase(org.city), zip: org.zip, phone: org.phone,
        sources: ["cms-nppes"], licensed: false, inclusionSignals: [],
      });
    }
    sources.push({
      source: "CMS NPPES provider registry", status: "complete",
      detail: `${nppesR.value.zips} nearest ZIPs × 2 taxonomies; ${unique.length} organizations pinned; individual clinicians counted by ZIP only` +
        (nppesR.value.failed ? `; ${nppesR.value.failed}/${nppesR.value.total} lookups failed` : ""),
    });
  } else sources.push({ source: "CMS NPPES provider registry", status: "unavailable", detail: errorText(nppesR.reason) });

  let merged = mergePlaces(places)
    .map((place) => ({ ...place, distanceMiles: Math.round(haversineMiles(center, place) * 100) / 100 }))
    .filter((place) => place.distanceMiles! <= radius)
    .sort((a, b) => a.distanceMiles! - b.distanceMiles!);

  // 5. Daycare websites: bounded, robots-respecting check for inclusion / special-needs language.
  const checks = Math.max(0, deps.websiteChecks ?? 12);
  const enrich = deps.enrichWebsite;
  if (enrich && checks > 0 && !signal.aborted) {
    const candidates = merged.filter((place) => place.kind === "daycare" && place.website).slice(0, checks);
    const results = await limited(candidates, 4, async (place) => ({ place, page: await enrich(place.website!) }));
    let checked = 0;
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.page) continue;
      checked++;
      const found = inclusionSignals(result.value.page.textSample);
      if (found.length) {
        const target = merged.find((item) => item.id === result.value.place.id)!;
        target.inclusionSignals = [...new Set([...target.inclusionSignals, ...found.map((term) => term + " (website)")])];
        if (!target.sources.includes("organization-website")) target.sources.push("organization-website");
      }
    }
    sources.push({ source: "Child-care websites", status: candidates.length ? "complete" : "not_applicable", detail: `${checked}/${candidates.length} public websites checked for inclusion and special-needs language` });
  }
  merged = merged.slice(0, 1200);
  clearTimeout(timer);
  return { center, radiusMiles: radius, places: merged, zipCounts, sources };
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const out = String(value).trim();
  return out || undefined;
}

function titleCase(value: string) {
  if (!value || value !== value.toUpperCase()) return value;
  return value.toLowerCase().replace(/\b([a-z])/g, (char) => char.toUpperCase());
}
