import { parseOverpassPlaces, type PlaceKind } from "../geo/osm";
import { STATE_BOUNDS } from "../geo/geo-math";
import type { JoinState, MetricId } from "./sources";
import { errorText, isRecord, limitedSettled, upperKeys } from "./util";

/**
 * Keyless county-level supply and referral counts, replacing programs that need a Census API key:
 *  - CMS NPPES (statewide, by taxonomy): ABA, pediatric, speech and OT organizations; developmental
 *    pediatricians and child psychologists counted by practice ZIP. Nobody is pinned or listed.
 *  - OpenStreetMap (statewide): child care, schools, hospitals, pediatric, therapy and ABA-named facilities.
 * Points are assigned to counties with TIGER county boundaries; NPPES ZIPs via ZIP-area centroids.
 */

export type Ring = number[][];
export interface CountyShape { fips: string; bbox: [number, number, number, number]; rings: Ring[] }

const ZCTA_SERVICE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer";
const NPPES_API = "https://npiregistry.cms.hhs.gov/api/";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const NPPES_PAGE = 200;
const NPPES_MAX_SKIP = 1000;

export const NPPES_COUNTY_QUERIES: ReadonlyArray<{ metric: MetricId; taxonomy: string; enumeration: "NPI-1" | "NPI-2"; label: string }> = [
  { metric: "nppes.aba_orgs", taxonomy: "Behavior Analyst", enumeration: "NPI-2", label: "ABA organizations" },
  { metric: "nppes.ped_orgs", taxonomy: "Pediatrics", enumeration: "NPI-2", label: "pediatric organizations" },
  { metric: "nppes.slp_orgs", taxonomy: "Speech-Language Pathologist", enumeration: "NPI-2", label: "speech-language organizations" },
  { metric: "nppes.ot_orgs", taxonomy: "Occupational Therapist", enumeration: "NPI-2", label: "occupational therapy organizations" },
  { metric: "nppes.dev_peds", taxonomy: "Developmental - Behavioral Pediatrics", enumeration: "NPI-1", label: "developmental-behavioral pediatricians" },
  { metric: "nppes.child_psych", taxonomy: "Clinical Child & Adolescent", enumeration: "NPI-1", label: "child & adolescent psychologists" },
];

export const OSM_COUNTY_METRICS: Readonly<Record<PlaceKind, MetricId>> = {
  daycare: "osm.childcare",
  school: "osm.schools",
  hospital: "osm.hospitals",
  pediatrics: "osm.pediatrics",
  therapy: "osm.therapy",
  aba_provider: "osm.aba_named",
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** TIGERweb county features (Esri JSON, WGS84 rings) -> shapes with bounding boxes. */
export function parseCountyShapes(payload: unknown, stateFips: string): CountyShape[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) return [];
  const shapes: CountyShape[] = [];
  for (const feature of payload.features) {
    if (!isRecord(feature) || !isRecord(feature.attributes) || !isRecord(feature.geometry) || !Array.isArray(feature.geometry.rings)) continue;
    const a = upperKeys(feature.attributes);
    const fips = String(a.GEOID ?? (String(a.STATE ?? "") + String(a.COUNTY ?? "")));
    if (!/^\d{5}$/.test(fips) || !fips.startsWith(stateFips)) continue;
    const rings = (feature.geometry.rings as unknown[]).filter((ring): ring is Ring =>
      Array.isArray(ring) && ring.length >= 4 && ring.every((pt) => Array.isArray(pt) && pt.length >= 2 && pt.every(Number.isFinite)));
    if (!rings.length) continue;
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (const ring of rings) for (const [x, y] of ring) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
    shapes.push({ fips, bbox: [w, s, e, n], rings });
  }
  return shapes;
}

function insideRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Even-odd rule across all rings, so holes (e.g. an independent city inside a county) are respected. */
export function countyForPoint(shapes: readonly CountyShape[], lat: number, lon: number): string | null {
  for (const shape of shapes) {
    const [w, s, e, n] = shape.bbox;
    if (lon < w || lon > e || lat < s || lat > n) continue;
    let inside = false;
    for (const ring of shape.rings) if (insideRing(lon, lat, ring)) inside = !inside;
    if (inside) return shape.fips;
  }
  return null;
}

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

/** NPPES page -> unique NPIs with their practice-location ZIP. Deactivated records are excluded. */
export function parseNppesStatewidePage(json: unknown): Array<{ npi: string; zip: string }> {
  if (!isRecord(json) || (json.result_count === undefined && !Array.isArray(json.results))) throw new Error("NPPES response missing result_count");
  if (Array.isArray(json.Errors) && json.Errors.length) throw new Error("NPPES rejected the request");
  const out: Array<{ npi: string; zip: string }> = [];
  for (const result of (json.results ?? []) as Array<Record<string, unknown>>) {
    const basic = isRecord(result.basic) ? result.basic : {};
    if (!result.number || basic.status === "D") continue;
    const addresses = Array.isArray(result.addresses) ? result.addresses.filter(isRecord) : [];
    const location = addresses.find((address) => address.address_purpose === "LOCATION") ?? addresses[0];
    const zip = String(location?.postal_code ?? "").slice(0, 5);
    if (/^\d{5}$/.test(zip)) out.push({ npi: String(result.number), zip });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export interface KeylessCountyResult {
  metrics: Map<string, Partial<Record<MetricId, number>>>;
  nppes: { status: "complete" | "unavailable"; detail: string };
  osm: { status: "complete" | "unavailable"; detail: string };
}

export async function collectKeylessCountyCounts(input: {
  state: JoinState;
  stateFips: string;
  shapes: Promise<CountyShape[]>;
  get: (url: string) => Promise<string>;
  post: (url: string, body: string) => Promise<string>;
  signal: AbortSignal;
}): Promise<KeylessCountyResult> {
  const metrics = new Map<string, Partial<Record<MetricId, number>>>();
  const bump = (fips: string, metric: MetricId) => {
    const entry = metrics.get(fips) ?? {};
    entry[metric] = (entry[metric] ?? 0) + 1;
    metrics.set(fips, entry);
  };

  const nppes = (async () => {
    const shapes = await input.shapes;
    if (!shapes.length) throw new Error("county boundaries unavailable");
    // ZIP areas across the state's bounding box, each assigned to the county containing its centroid.
    const layer = zctaLayerId(JSON.parse(await input.get(`${ZCTA_SERVICE}?f=json`)));
    if (layer === null) throw new Error("ZCTA layer not found");
    const box = STATE_BOUNDS[input.state];
    const zipCounty = new Map<string, string>();
    for (let page = 0; page < 8; page++) {
      const params = new URLSearchParams({
        geometry: `${box.west},${box.south},${box.east},${box.north}`, geometryType: "esriGeometryEnvelope", inSR: "4326",
        spatialRel: "esriSpatialRelIntersects", outFields: "ZCTA5,GEOID,CENTLAT,CENTLON", returnGeometry: "false",
        resultOffset: String(page * 1000), resultRecordCount: "1000", orderByFields: "GEOID", f: "json",
      });
      const rows = parseZctaCentroids(JSON.parse(await input.get(`${ZCTA_SERVICE}/${layer}/query?${params.toString()}`)));
      for (const row of rows) {
        const fips = countyForPoint(shapes, row.lat, row.lon);
        if (fips) zipCounty.set(row.zip, fips);
      }
      if (rows.length < 1000) break;
    }
    if (!zipCounty.size) throw new Error("no ZIP areas mapped to counties");

    const jobs = NPPES_COUNTY_QUERIES.flatMap((query) =>
      Array.from({ length: NPPES_MAX_SKIP / NPPES_PAGE + 1 }, (_, page) => ({ query, skip: page * NPPES_PAGE })));
    // Fetch page 0 of each taxonomy first; later pages only when the previous page was full.
    const pages = new Map<string, Array<{ npi: string; zip: string }>[]>();
    const unavailable = new Set<MetricId>();
    const partial = new Set<MetricId>();
    for (let skip = 0; skip <= NPPES_MAX_SKIP; skip += NPPES_PAGE) {
      const wave = jobs.filter((job) => job.skip === skip && (skip === 0 || (pages.get(job.query.metric)?.at(-1)?.length ?? 0) === NPPES_PAGE));
      if (!wave.length || input.signal.aborted) break;
      const results = await limitedSettled(wave, 6, async ({ query }) => {
        const params = new URLSearchParams({
          version: "2.1", state: input.state, taxonomy_description: query.taxonomy, enumeration_type: query.enumeration,
          address_purpose: "LOCATION", limit: String(NPPES_PAGE), skip: String(skip),
        });
        return parseNppesStatewidePage(JSON.parse(await input.get(`${NPPES_API}?${params.toString()}`)));
      });
      results.forEach((result, index) => {
        const metric = wave[index].query.metric;
        if (result.status === "rejected") {
          // First page failed: the count is unknown. Later page failed: the count is a lower bound.
          (skip === 0 ? unavailable : partial).add(metric);
          pages.set(metric, [...(pages.get(metric) ?? []), []]);
          return;
        }
        pages.set(metric, [...(pages.get(metric) ?? []), result.value]);
      });
    }
    const notes: string[] = [];
    let unassigned = 0;
    for (const query of NPPES_COUNTY_QUERIES) {
      if (unavailable.has(query.metric)) { notes.push(`${query.label} unavailable`); continue; }
      const all = (pages.get(query.metric) ?? []).flat();
      const unique = new Map(all.map((item) => [item.npi, item.zip]));
      for (const zip of unique.values()) {
        const fips = zipCounty.get(zip);
        if (fips) bump(fips, query.metric); else unassigned++;
      }
      const truncated = all.length >= NPPES_MAX_SKIP + NPPES_PAGE;
      notes.push(`${unique.size}${truncated || partial.has(query.metric) ? "+" : ""} ${query.label}${truncated ? " (registry page limit)" : partial.has(query.metric) ? " (a page failed)" : ""}`);
    }
    // Zero-fill: a county with no matching registrations has zero, once the statewide query succeeded.
    for (const fips of new Set(zipCounty.values())) for (const query of NPPES_COUNTY_QUERIES) {
      if (unavailable.has(query.metric)) continue;
      const entry = metrics.get(fips) ?? {};
      entry[query.metric] ??= 0;
      metrics.set(fips, entry);
    }
    if (unavailable.size === NPPES_COUNTY_QUERIES.length) throw new Error("all NPPES statewide queries failed");
    return `${notes.join(", ")}; ${zipCounty.size} ZIP areas mapped${unassigned ? `; ${unassigned} registrations outside mapped ZIP areas` : ""}`;
  })();

  // Overpass starts immediately (it does not need county outlines until assignment) and is split so the
  // numerous schools do not hold up child care, clinics and hospitals. Each query zero-fills only its own kinds.
  const area = `[out:json][timeout:40];area["ISO3166-2"="US-${input.state}"]["admin_level"="4"]->.s;`;
  // Four light queries instead of one heavy one: a statewide case-insensitive name match on clinics is the
  // expensive part, so it runs alone. At most two run at once (Overpass allows ~2 slots per client).
  const osmSpecs: Array<{ kinds: PlaceKind[]; body: string }> = [
    { kinds: ["daycare"], body: `nwr(area.s)["amenity"~"^(childcare|kindergarten)$"];` },
    { kinds: ["school"], body: `nwr(area.s)["amenity"="school"];` },
    { kinds: ["hospital", "therapy"], body: `(nwr(area.s)["amenity"="hospital"];nwr(area.s)["healthcare"~"^(speech_therapist|occupational_therapist|psychotherapist)$"];);` },
    { kinds: ["pediatrics", "aba_provider"], body: `nwr(area.s)["amenity"~"^(doctors|clinic)$"]["name"~"pediatric|paediatric|children|kids|autism|ABA|behavio",i];` },
  ];
  const osmTexts = limitedSettled(osmSpecs, 2, (spec) => input.post(OVERPASS, "data=" + encodeURIComponent(area + spec.body + "out center tags;")));
  const osmQueries = osmSpecs.map((spec, index) => ({
    kinds: spec.kinds,
    text: osmTexts.then((results) => {
      const result = results[index];
      if (result.status === "rejected") throw result.reason;
      return result.value;
    }),
  }));
  for (const query of osmQueries) query.text.catch(() => undefined);
  const osm = (async () => {
    const shapes = await input.shapes;
    if (!shapes.length) throw new Error("county boundaries unavailable");
    const settled = await Promise.allSettled(osmQueries.map(async (query) => ({ kinds: query.kinds, places: parseOverpassPlaces(JSON.parse(await query.text)) })));
    const succeeded = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
    if (!succeeded.length) throw new Error((settled[0] as PromiseRejectedResult).reason instanceof Error ? errorText((settled[0] as PromiseRejectedResult).reason) : "Overpass failed");
    let outside = 0, assigned = 0;
    const counts: Partial<Record<PlaceKind, number>> = {};
    const seen = new Set<string>();
    for (const { places } of succeeded) for (const place of places) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      const fips = countyForPoint(shapes, place.lat, place.lon);
      if (!fips) { outside++; continue; }
      assigned++;
      bump(fips, OSM_COUNTY_METRICS[place.kind]);
      counts[place.kind] = (counts[place.kind] ?? 0) + 1;
    }
    const covered = new Set(succeeded.flatMap((item) => item.kinds));
    for (const shape of shapes) {
      const entry = metrics.get(shape.fips) ?? {};
      for (const kind of covered) entry[OSM_COUNTY_METRICS[kind]] ??= 0;
      metrics.set(shape.fips, entry);
    }
    // A kind whose query failed must not keep partial counts that would read as complete.
    for (const kind of Object.keys(OSM_COUNTY_METRICS) as PlaceKind[]) {
      if (covered.has(kind)) continue;
      for (const entry of metrics.values()) delete entry[OSM_COUNTY_METRICS[kind]];
    }
    const failed = settled.length - succeeded.length;
    return `${assigned} named facilities assigned to counties (` + Object.entries(counts).map(([kind, n]) => `${n} ${kind}`).join(", ") + ")" +
      (outside ? `; ${outside} outside county outlines` : "") +
      (failed ? `; ${failed} of ${settled.length} Overpass queries failed` : "");
  })();

  const [nppesR, osmR] = await Promise.allSettled([nppes, osm]);
  // Drop metrics from a source that failed so its zero-fill never reads as "none".
  if (nppesR.status === "rejected") for (const entry of metrics.values()) for (const query of NPPES_COUNTY_QUERIES) delete entry[query.metric];
  if (osmR.status === "rejected") for (const entry of metrics.values()) for (const metric of Object.values(OSM_COUNTY_METRICS)) delete entry[metric];
  return {
    metrics,
    nppes: nppesR.status === "fulfilled" ? { status: "complete", detail: nppesR.value } : { status: "unavailable", detail: errorText(nppesR.reason) },
    osm: osmR.status === "fulfilled" ? { status: "complete", detail: osmR.value } : { status: "unavailable", detail: errorText(osmR.reason) },
  };
}
