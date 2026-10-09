import {
  ACS_BATCHES, acsMetricsFromRow, defaultFetchText, errorText, fetchAcsRows, isRecord, upperKeys,
  type FetchText, type ProgramStatus,
} from "../joins/collectors";
import { STATE_FIPS, type JoinState, type MetricId } from "../joins/sources";

/**
 * Census-tract frames (roughly 1–3 miles across in towns, larger in rural areas).
 * Tracts are the finest public geography with child age, disability and insurance detail.
 * They are AREA aggregates of ~4,000 residents: never households or individuals.
 */
export interface TractFrame {
  geoid: string;
  countyFips: string;
  name: string;
  lat: number;
  lon: number;
  landSqmi: number;
  metrics: Partial<Record<MetricId, number>>;
}

export interface StateTracts {
  state: JoinState;
  capturedAt: string;
  tracts: TractFrame[];
  programs: ProgramStatus[];
  integrityIssues: string[];
}

const TIGER_TRACTS = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer";
const SQ_METERS_PER_SQ_MILE = 2_589_988.110336;
const PAGE = 1000;

export function tractLayerId(serviceJson: unknown): number | null {
  if (!isRecord(serviceJson) || !Array.isArray(serviceJson.layers)) return null;
  for (const layer of serviceJson.layers) {
    if (isRecord(layer) && typeof layer.id === "number" && typeof layer.name === "string" && /^census tracts$/i.test(layer.name.trim())) return layer.id;
  }
  return null;
}

export function parseTigerTractPage(payload: unknown, stateFips: string): { rows: Array<{ geoid: string; lat: number; lon: number; landSqmi: number }>; more: boolean } {
  if (!isRecord(payload) || !Array.isArray(payload.features)) throw new Error("TIGER tract query returned no features");
  const rows: Array<{ geoid: string; lat: number; lon: number; landSqmi: number }> = [];
  for (const feature of payload.features) {
    if (!isRecord(feature) || !isRecord(feature.attributes)) continue;
    const a = upperKeys(feature.attributes);
    const geoid = String(a.GEOID ?? "");
    const lat = Number(a.CENTLAT ?? a.INTPTLAT);
    const lon = Number(a.CENTLON ?? a.INTPTLON);
    const area = Number(a.AREALAND);
    if (!/^\d{11}$/.test(geoid) || !geoid.startsWith(stateFips) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    rows.push({ geoid, lat, lon, landSqmi: Number.isFinite(area) && area > 0 ? area / SQ_METERS_PER_SQ_MILE : 0 });
  }
  return { rows, more: payload.exceededTransferLimit === true || payload.features.length >= PAGE };
}

export async function collectStateTracts(state: JoinState, options: { fetchText?: FetchText; timeoutMs?: number } = {}): Promise<StateTracts> {
  const fetchText = options.fetchText ?? defaultFetchText;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);
  const signal = controller.signal;
  const get = (url: string) => fetchText(url, signal);
  const stateFips = STATE_FIPS[state];
  const programs: ProgramStatus[] = [];
  const integrityIssues: string[] = [];

  const tiger = (async () => {
    let layer = 0;
    try { layer = tractLayerId(JSON.parse(await get(`${TIGER_TRACTS}?f=json`))) ?? 0; } catch { /* documented default */ }
    const out: Array<{ geoid: string; lat: number; lon: number; landSqmi: number }> = [];
    for (let page = 0; page < 12; page++) {
      const params = new URLSearchParams({
        where: `STATE='${stateFips}'`, outFields: "GEOID,CENTLAT,CENTLON,AREALAND", returnGeometry: "false",
        orderByFields: "GEOID", resultOffset: String(page * PAGE), resultRecordCount: String(PAGE), f: "json",
      });
      const { rows, more } = parseTigerTractPage(JSON.parse(await get(`${TIGER_TRACTS}/${layer}/query?${params.toString()}`)), stateFips);
      out.push(...rows);
      if (!more || rows.length === 0) break;
    }
    if (!out.length) throw new Error("no tract centroids");
    return out;
  })();

  const acs = fetchAcsRows({
    get, signal, stateFips, level: "tract", variables: ACS_BATCHES.flat(),
    counties: async () => [...new Set((await tiger).map((row) => row.geoid.slice(0, 5)))],
  });

  const [acsR, tigerR] = await Promise.allSettled([acs, tiger]);
  clearTimeout(timer);
  const tracts: TractFrame[] = [];
  if (tigerR.status === "fulfilled") {
    // Geography is kept even without ACS so a point still resolves to its county; demand stays blank, not zero.
    const acsRows = acsR.status === "fulfilled" ? acsR.value.rows : new Map<string, Record<string, string>>();
    for (const place of tigerR.value) {
      const row = acsRows.get(place.geoid);
      const parsed = row ? acsMetricsFromRow(row) : { metrics: {}, issues: [] as string[] };
      if (parsed.issues.length) integrityIssues.push(`${row?.NAME || place.geoid}: ${parsed.issues[0]}`);
      tracts.push({ geoid: place.geoid, countyFips: place.geoid.slice(0, 5), name: row?.NAME || place.geoid, lat: place.lat, lon: place.lon, landSqmi: place.landSqmi, metrics: parsed.metrics });
    }
  }
  programs.push(acsR.status === "fulfilled"
    ? { program: "census-acs5", status: "complete", vintage: acsR.value.vintage, detail: `${acsR.value.rows.size} tracts via ${acsR.value.via}${acsR.value.partial.length ? "; " + acsR.value.partial.join("; ") : ""}` }
    : { program: "census-acs5", status: "unavailable", vintage: null, detail: errorText(acsR.reason) });
  programs.push(tigerR.status === "fulfilled"
    ? { program: "census-tiger", status: "complete", vintage: "current", detail: `${tigerR.value.length} tract centroids` }
    : { program: "census-tiger", status: "unavailable", vintage: null, detail: errorText(tigerR.reason) });
  return { state, capturedAt: new Date().toISOString(), tracts, programs, integrityIssues };
}

const CACHE = new Map<JoinState, { at: number; ttl: number; value: Promise<StateTracts> }>();
export function getStateTracts(state: JoinState, options: { fetchText?: FetchText; force?: boolean } = {}): Promise<StateTracts> {
  const cached = CACHE.get(state);
  if (!options.force && cached && Date.now() - cached.at < cached.ttl) return cached.value;
  const value = collectStateTracts(state, options);
  const entry = { at: Date.now(), ttl: 30 * 60 * 1000, value };
  CACHE.set(state, entry);
  // Complete tract data is cached for 12 hours; partial data is retried after 30 minutes.
  value.then((result) => { if (result.programs.every((program) => program.status === "complete" && !program.detail.includes("failed"))) entry.ttl = 12 * 60 * 60 * 1000; }, () => undefined);
  value.then((result) => { if (!result.tracts.some((tract) => tract.metrics["acs.kids"] !== undefined)) CACHE.delete(state); }, () => CACHE.delete(state));
  return value;
}

/** Statewide tract hotspot score: where young children, developmental need and insured families concentrate. */
export interface TractHotspot {
  geoid: string; countyFips: string; lat: number; lon: number;
  kidsUnder6: number; score: number; smallSample: boolean;
}

export function tractHotspots(tracts: readonly TractFrame[], countyServiceGap: ReadonlyMap<string, number>): TractHotspot[] {
  const measures: Array<(t: TractFrame) => number | null> = [
    (t) => t.landSqmi > 0 && t.metrics["acs.kids_u6"] !== undefined ? t.metrics["acs.kids_u6"]! / t.landSqmi : null,
    (t) => {
      const kids = (t.metrics["acs.dis_u5"] ?? NaN) + (t.metrics["acs.dis_5to17"] ?? NaN);
      const universe = (t.metrics["acs.dis_u5_universe"] ?? NaN) + (t.metrics["acs.dis_5to17_universe"] ?? NaN);
      return Number.isFinite(kids) && universe >= 100 ? kids / universe : null;
    },
    (t) => {
      const insured = (t.metrics["acs.u19_employer"] ?? NaN) + (t.metrics["acs.u19_medicaid"] ?? NaN);
      const u19 = t.metrics["acs.u19"] ?? 0;
      return Number.isFinite(insured) && u19 >= 100 ? insured / u19 : null;
    },
    (t) => t.metrics["acs.u6_parent_universe"] && t.metrics["acs.u6_parent_universe"]! >= 50 && t.metrics["acs.u6_working_parents"] !== undefined
      ? t.metrics["acs.u6_working_parents"]! / t.metrics["acs.u6_parent_universe"]! : null,
  ];
  const distributions = measures.map((fn) => tracts.map(fn).filter((value): value is number => value !== null).sort((a, b) => a - b));
  const pct = (sorted: number[], value: number) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < value) lo = mid + 1; else hi = mid; }
    return sorted.length ? (lo / sorted.length) * 100 : 0;
  };
  return tracts.flatMap((tract) => {
    const parts = measures.map((fn, i) => { const value = fn(tract); return value === null ? null : pct(distributions[i], value); })
      .filter((value): value is number => value !== null);
    const gap = countyServiceGap.get(tract.countyFips);
    if (gap !== undefined) parts.push(gap);
    if (parts.length < 3) return [];
    const kidsUnder6 = tract.metrics["acs.kids_u6"] ?? 0;
    return [{
      geoid: tract.geoid, countyFips: tract.countyFips, lat: tract.lat, lon: tract.lon, kidsUnder6,
      score: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length),
      smallSample: (tract.metrics["acs.kids"] ?? 0) < 150,
    }];
  });
}
