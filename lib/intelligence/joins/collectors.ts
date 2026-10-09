import { MISSOURI_CHILD_CARE_LAYER_URL } from "../official/mo-child-care-gis";
import { CBP_NAICS, STATE_FIPS, type JoinState, type MetricId, type ProgramId } from "./sources";

/**
 * Statewide, county-level collectors for the structured programs in ./sources.
 * One request returns every county in a state, so a full state frame costs ~18 requests.
 * Parsers are pure and exported so they can be verified against recorded payloads.
 */

export interface CountyFrame {
  state: JoinState;
  /** 5-digit state+county FIPS code. */
  fips: string;
  /** e.g. "Jackson County, Missouri" */
  name: string;
  metrics: Partial<Record<MetricId, number>>;
}

export interface ProgramStatus {
  program: ProgramId;
  status: "complete" | "unavailable" | "not_applicable";
  detail: string;
  vintage: string | null;
}

export interface StateCountyBundle {
  state: JoinState;
  capturedAt: string;
  frames: CountyFrame[];
  programs: ProgramStatus[];
  /** Data that failed internal consistency checks and was dropped rather than used. */
  integrityIssues: string[];
}

export type FetchText = (url: string, signal: AbortSignal) => Promise<string>;
type Row = Record<string, string>;
type MetricPatch = Map<string, { name?: string; metrics: Partial<Record<MetricId, number>> }>;

const CENSUS_API = "https://api.census.gov/data";
const ACS_YEARS = [2024, 2023] as const;
const ACS_PRIOR_YEAR = 2019;
const SAIPE_YEARS = [2024, 2023, 2022] as const;
const SAHIE_YEARS = [2023, 2022] as const;
const CBP_CONFIGS = [
  { year: 2023, field: "NAICS2022" },
  { year: 2023, field: "NAICS2017" },
  { year: 2022, field: "NAICS2017" },
  { year: 2021, field: "NAICS2017" },
] as const;
const TIGER_SERVICE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer";
export const HRSA_MH_HPSA_CSV = "https://data.hrsa.gov/DataDownload/DD_Files/BCD_HPSA_FCT_DET_MH.csv";
const COLORADO_CHILDCARE_API = "https://data.colorado.gov/resource/a9rr-k8mu.json";
const SQ_METERS_PER_SQ_MILE = 2_589_988.110336;
const MAX_RESPONSE_BYTES = 80 * 1024 * 1024;

/** ACS 5-year detail-table variables. Split in two requests (Census allows 50 variables per call). */
export const ACS_BATCHES: readonly (readonly string[])[] = [
  [
    "B01003_001E",
    "B09001_001E", "B09001_003E", "B09001_004E", "B09001_005E", "B09001_006E", "B09001_007E", "B09001_008E", "B09001_009E",
    "B11005_001E", "B11005_002E",
    "B27010_002E", "B27010_004E", "B27010_007E", "B27010_017E",
    "B17020_003E", "B17020_004E", "B17020_005E", "B17020_011E", "B17020_012E", "B17020_013E",
    "B19013_001E", "B19125_002E",
    "B18101_003E", "B18101_004E", "B18101_006E", "B18101_007E", "B18101_022E", "B18101_023E", "B18101_025E", "B18101_026E",
  ],
  [
    "B18104_003E", "B18104_004E", "B18104_019E", "B18104_020E",
    "B28002_001E", "B28002_013E",
    "B08201_001E", "B08201_002E",
    "B08013_001E", "B08303_001E",
    "C16002_001E", "C16002_004E", "C16002_007E", "C16002_010E", "C16002_013E",
    "B23008_002E", "B23008_004E", "B23008_010E", "B23008_013E",
  ],
];

/** The ACS label each variable must carry. Checked by the live smoke test against the Census variable API. */
export const ACS_EXPECTED_LABELS: Readonly<Record<string, readonly string[]>> = {
  B09001_001E: ["Total"],
  B09001_003E: ["Under 3 years"],
  B11005_002E: ["Households with one or more people under 18 years"],
  B27010_002E: ["Under 19 years"],
  B27010_004E: ["Under 19 years", "employer-based health insurance only"],
  B27010_007E: ["Under 19 years", "Medicaid/means-tested public coverage only"],
  B27010_017E: ["Under 19 years", "No health insurance coverage"],
  B17020_003E: ["below poverty level", "Under 6 years"],
  B17020_011E: ["at or above poverty level", "Under 6 years"],
  B19125_002E: ["With own children"],
  B18101_004E: ["Male", "Under 5 years", "With a disability"],
  B18101_026E: ["Female", "5 to 17 years", "With a disability"],
  B18104_004E: ["Male", "5 to 17 years", "With a cognitive difficulty"],
  B18104_020E: ["Female", "5 to 17 years", "With a cognitive difficulty"],
  B28002_013E: ["No Internet access"],
  B08201_002E: ["No vehicle available"],
  C16002_004E: ["Spanish", "Limited English speaking household"],
  C16002_013E: ["Other languages", "Limited English speaking household"],
  B23008_004E: ["Under 6 years", "Living with two parents", "Both parents in labor force"],
  B23008_013E: ["Under 6 years", "Living with mother", "In labor force"],
};

// ---------------------------------------------------------------------------
// Pure parsers
// ---------------------------------------------------------------------------

/** Census Data API JSON: a header row followed by value rows. */
export function parseCensusTable(raw: string): Row[] {
  const text = raw.trim();
  if (!text.startsWith("[")) throw new Error("Census API returned a non-JSON response");
  const payload = JSON.parse(text) as unknown;
  if (!Array.isArray(payload) || payload.length < 1 || !Array.isArray(payload[0])) {
    throw new Error("Census API returned an unexpected table shape");
  }
  const header = (payload[0] as unknown[]).map(String);
  return (payload.slice(1) as unknown[][]).map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] == null ? "" : String(values[index])])),
  );
}

function rowFips(row: Row): string | null {
  const state = (row.state ?? "").padStart(2, "0");
  const county = (row.county ?? "").padStart(3, "0");
  return /^\d{2}$/.test(state) && /^\d{3}$/.test(county) && county !== "000" ? state + county : null;
}

/** Non-negative finite numbers only; Census uses large negative sentinels for suppressed medians. */
function count(row: Row, key: string): number | undefined {
  const raw = row[key];
  if (raw === undefined || raw === "" || raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function total(...values: Array<number | undefined>): number | undefined {
  return values.some((value) => value === undefined) ? undefined : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

const PART_OF_WHOLE: ReadonlyArray<[MetricId, MetricId]> = [
  ["acs.kids", "acs.pop"],
  ["acs.kids_u6", "acs.kids"],
  ["acs.kids_6to17", "acs.kids"],
  ["acs.kids_6to11", "acs.kids_6to17"],
  ["acs.kids_12to17", "acs.kids_6to17"],
  ["acs.hh_kids", "acs.hh"],
  ["acs.u19_employer", "acs.u19"],
  ["acs.u19_medicaid", "acs.u19"],
  ["acs.u19_uninsured", "acs.u19"],
  ["acs.kids_pov", "acs.kids_pov_universe"],
  ["acs.dis_u5", "acs.dis_u5_universe"],
  ["acs.dis_5to17", "acs.dis_5to17_universe"],
  ["acs.cog_5to17", "acs.cog_universe"],
  ["acs.hh_no_internet", "acs.hh_internet_universe"],
  ["acs.hh_no_vehicle", "acs.hh_vehicle_universe"],
  ["acs.lep_hh", "acs.lep_universe"],
  ["acs.u6_working_parents", "acs.u6_parent_universe"],
];

/**
 * Universe checks that catch a renumbered ACS variable: each table's child universe must line up
 * with the independent B09001 child counts. A mismatch drops the table instead of using bad data.
 */
const UNIVERSE_CHECKS: ReadonlyArray<{ table: string; metrics: MetricId[]; universe: MetricId; base: (m: Partial<Record<MetricId, number>>) => number | undefined; min: number; max: number }> = [
  { table: "B27010", metrics: ["acs.u19", "acs.u19_employer", "acs.u19_medicaid", "acs.u19_uninsured"], universe: "acs.u19", base: (m) => m["acs.kids"], min: 0.85, max: 1.3 },
  { table: "B17020", metrics: ["acs.kids_pov", "acs.kids_pov_universe"], universe: "acs.kids_pov_universe", base: (m) => m["acs.kids"], min: 0.75, max: 1.1 },
  { table: "B18101", metrics: ["acs.dis_5to17", "acs.dis_5to17_universe"], universe: "acs.dis_5to17_universe", base: (m) => m["acs.kids_6to17"], min: 0.9, max: 1.3 },
  { table: "B18104", metrics: ["acs.cog_5to17", "acs.cog_universe"], universe: "acs.cog_universe", base: (m) => m["acs.kids_6to17"], min: 0.9, max: 1.3 },
  { table: "B23008", metrics: ["acs.u6_working_parents", "acs.u6_parent_universe"], universe: "acs.u6_parent_universe", base: (m) => m["acs.kids_u6"], min: 0.75, max: 1.1 },
];

export function acsMetricsFromRow(row: Row): { metrics: Partial<Record<MetricId, number>>; issues: string[] } {
  const v = (key: string) => count(row, key);
  const metrics: Partial<Record<MetricId, number>> = {
    "acs.pop": v("B01003_001E"),
    "acs.kids": v("B09001_001E"),
    "acs.kids_u3": v("B09001_003E"),
    "acs.kids_3to5": total(v("B09001_004E"), v("B09001_005E")),
    "acs.kids_u6": total(v("B09001_003E"), v("B09001_004E"), v("B09001_005E")),
    "acs.kids_6to17": total(v("B09001_006E"), v("B09001_007E"), v("B09001_008E"), v("B09001_009E")),
    "acs.kids_6to11": total(v("B09001_006E"), v("B09001_007E")),
    "acs.kids_12to17": total(v("B09001_008E"), v("B09001_009E")),
    "acs.hh": v("B11005_001E"),
    "acs.hh_kids": v("B11005_002E"),
    "acs.u19": v("B27010_002E"),
    "acs.u19_employer": v("B27010_004E"),
    "acs.u19_medicaid": v("B27010_007E"),
    "acs.u19_uninsured": v("B27010_017E"),
    "acs.kids_pov": total(v("B17020_003E"), v("B17020_004E"), v("B17020_005E")),
    "acs.kids_pov_universe": total(v("B17020_003E"), v("B17020_004E"), v("B17020_005E"), v("B17020_011E"), v("B17020_012E"), v("B17020_013E")),
    "acs.mhi": v("B19013_001E"),
    "acs.mfi_kids": v("B19125_002E"),
    "acs.dis_u5": total(v("B18101_004E"), v("B18101_023E")),
    "acs.dis_u5_universe": total(v("B18101_003E"), v("B18101_022E")),
    "acs.dis_5to17": total(v("B18101_007E"), v("B18101_026E")),
    "acs.dis_5to17_universe": total(v("B18101_006E"), v("B18101_025E")),
    "acs.cog_5to17": total(v("B18104_004E"), v("B18104_020E")),
    "acs.cog_universe": total(v("B18104_003E"), v("B18104_019E")),
    "acs.hh_internet_universe": v("B28002_001E"),
    "acs.hh_no_internet": v("B28002_013E"),
    "acs.hh_vehicle_universe": v("B08201_001E"),
    "acs.hh_no_vehicle": v("B08201_002E"),
    "acs.commute_minutes": v("B08013_001E"),
    "acs.commuters": v("B08303_001E"),
    "acs.lep_universe": v("C16002_001E"),
    "acs.lep_hh": total(v("C16002_004E"), v("C16002_007E"), v("C16002_010E"), v("C16002_013E")),
    "acs.u6_parent_universe": v("B23008_002E"),
    "acs.u6_working_parents": total(v("B23008_004E"), v("B23008_010E"), v("B23008_013E")),
  };
  const issues: string[] = [];
  for (const [part, whole] of PART_OF_WHOLE) {
    const a = metrics[part];
    const b = metrics[whole];
    if (a !== undefined && b !== undefined && a > b) {
      issues.push(`${part} exceeds ${whole}; both dropped`);
      delete metrics[part];
      delete metrics[whole];
    }
  }
  for (const check of UNIVERSE_CHECKS) {
    const universe = metrics[check.universe];
    const base = check.base(metrics);
    if (universe === undefined || base === undefined || base < 200) continue;
    const ratio = universe / base;
    if (ratio < check.min || ratio > check.max) {
      issues.push(`ACS ${check.table} child universe is ${ratio.toFixed(2)}x the B09001 child count; table dropped`);
      for (const metric of check.metrics) delete metrics[metric];
    }
  }
  for (const key of Object.keys(metrics) as MetricId[]) if (metrics[key] === undefined) delete metrics[key];
  return { metrics, issues };
}

export function parseSaipeRows(rows: readonly Row[]): MetricPatch {
  const patch: MetricPatch = new Map();
  for (const row of rows) {
    const fips = rowFips(row);
    if (!fips) continue;
    const rate = count(row, "SAEPOVRT0_17_PT");
    const metrics: Partial<Record<MetricId, number>> = {};
    if (rate !== undefined && rate <= 100) metrics["saipe.child_pov_rate"] = rate;
    const mhi = count(row, "SAEMHI_PT");
    if (mhi !== undefined) metrics["saipe.mhi"] = mhi;
    patch.set(fips, { name: row.NAME, metrics });
  }
  return patch;
}

export function parseSahieRows(rows: readonly Row[]): MetricPatch {
  const patch: MetricPatch = new Map();
  for (const row of rows) {
    const fips = rowFips(row);
    // Only the under-19, all-income, all-sex, all-race cell.
    if (!fips || (row.AGECAT && row.AGECAT !== "4") || (row.IPRCAT && row.IPRCAT !== "0") ||
      (row.SEXCAT && row.SEXCAT !== "0") || (row.RACECAT && row.RACECAT !== "0")) continue;
    const metrics: Partial<Record<MetricId, number>> = {};
    const insured = count(row, "NIC_PT");
    const uninsured = count(row, "NUI_PT");
    const rate = count(row, "PCTUI_PT");
    if (insured !== undefined) metrics["sahie.u19_insured"] = insured;
    if (uninsured !== undefined) metrics["sahie.u19_uninsured"] = uninsured;
    if (rate !== undefined && rate <= 100) metrics["sahie.u19_uninsured_rate"] = rate;
    patch.set(fips, { name: row.NAME, metrics });
  }
  return patch;
}

/**
 * CBP lists only counties with at least one employer establishment in the NAICS code, and may return
 * one row per size class. The largest ESTAB value per county is the all-establishments total.
 */
export function parseCbpRows(rows: readonly Row[]): Map<string, { name?: string; estab: number }> {
  const out = new Map<string, { name?: string; estab: number }>();
  for (const row of rows) {
    const fips = rowFips(row);
    const estab = count(row, "ESTAB");
    if (!fips || estab === undefined) continue;
    const prior = out.get(fips);
    if (!prior || estab > prior.estab) out.set(fips, { name: row.NAME ?? prior?.name, estab });
  }
  return out;
}

export function tigerCountyLayerId(serviceJson: unknown): number | null {
  if (!isRecord(serviceJson) || !Array.isArray(serviceJson.layers)) return null;
  for (const layer of serviceJson.layers) {
    if (isRecord(layer) && typeof layer.id === "number" && typeof layer.name === "string" &&
      /^count(y|ies)$/i.test(layer.name.trim())) return layer.id;
  }
  return null;
}

export function parseTigerCounties(payload: unknown, stateFips: string): MetricPatch {
  const patch: MetricPatch = new Map();
  if (!isRecord(payload) || !Array.isArray(payload.features)) return patch;
  for (const feature of payload.features) {
    if (!isRecord(feature) || !isRecord(feature.attributes)) continue;
    const a = upperKeys(feature.attributes);
    const geoid = String(a.GEOID ?? (String(a.STATE ?? "") + String(a.COUNTY ?? "")));
    if (!/^\d{5}$/.test(geoid) || !geoid.startsWith(stateFips)) continue;
    const area = Number(a.AREALAND);
    const lat = Number(a.CENTLAT ?? a.INTPTLAT);
    const lon = Number(a.CENTLON ?? a.INTPTLON);
    const metrics: Partial<Record<MetricId, number>> = {};
    if (Number.isFinite(area) && area > 0) metrics["tiger.land_sqmi"] = area / SQ_METERS_PER_SQ_MILE;
    if (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180) {
      metrics["tiger.lat"] = lat;
      metrics["tiger.lon"] = lon;
    }
    patch.set(geoid, { name: typeof a.NAME === "string" ? a.NAME : undefined, metrics });
  }
  return patch;
}

/** RFC 4180 CSV with quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/**
 * Highest active geographic/population Mental Health HPSA score per county.
 * Facility designations (e.g. a single clinic or prison) describe a site, not the county, and are excluded.
 * Returns null when the file has no recognisable rows for the state (parse failure, not "no shortage").
 */
export function parseHpsaMentalHealthCsv(text: string, stateFips: string): Map<string, number> | null {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length < 2) return null;
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const find = (...patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const index = header.findIndex((cell) => pattern.test(cell));
      if (index >= 0) return index;
    }
    return -1;
  };
  const fipsCol = find(/^common state county fips code$/, /^state and county federal information processing standard code$/, /county.*fips/);
  const scoreCol = find(/^hpsa score$/);
  const statusCol = find(/^hpsa status$/);
  const typeCol = find(/^designation type$/, /^hpsa type description$/);
  const disciplineCol = find(/^hpsa discipline class$/);
  if (fipsCol < 0 || scoreCol < 0 || statusCol < 0) return null;
  const scores = new Map<string, number>();
  let stateRows = 0;
  for (const cells of rows.slice(1)) {
    const fips = (cells[fipsCol] ?? "").replace(/\D/g, "").padStart(5, "0");
    if (!fips.startsWith(stateFips) || fips.length !== 5) continue;
    if (disciplineCol >= 0 && !/mental/i.test(cells[disciplineCol] ?? "")) continue;
    stateRows++;
    if (/withdrawn/i.test(cells[statusCol] ?? "")) continue;
    if (typeCol >= 0 && !/geographic|population/i.test(cells[typeCol] ?? "")) continue;
    const score = Number(cells[scoreCol]);
    if (!Number.isFinite(score) || score < 0 || score > 26) continue;
    scores.set(fips, Math.max(scores.get(fips) ?? 0, score));
  }
  return stateRows > 0 ? scores : null;
}

/** Letters-only county key: "St. Louis city, Missouri" -> "stlouiscity"; "DE KALB" -> "dekalb". */
export function countyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/,.*$/, "")
    .replace(/\bsainte\b/g, "ste")
    .replace(/\bsaint\b/g, "st")
    .replace(/\b(county|parish)\b/g, "")
    .replace(/[^a-z]/g, "");
}

export function parseMissouriChildCareStats(payload: unknown): Map<string, { sites: number; capacity: number | null }> {
  const out = new Map<string, { sites: number; capacity: number | null }>();
  if (!isRecord(payload) || !Array.isArray(payload.features)) throw new Error("Missouri child-care statistics returned no features");
  for (const feature of payload.features) {
    if (!isRecord(feature) || !isRecord(feature.attributes)) continue;
    const a = upperKeys(feature.attributes);
    const county = typeof a.COUNTY === "string" ? countyKey(a.COUNTY) : "";
    const status = typeof a.STATUS === "string" ? a.STATUS : "";
    if (!county || /\b(closed|inactive|revoked|expired|suspended|terminated)\b/i.test(status)) continue;
    const sites = Number(a.SITES);
    const capacity = Number(a.CAPACITY);
    if (!Number.isFinite(sites) || sites < 0) continue;
    const prior = out.get(county) ?? { sites: 0, capacity: 0 };
    out.set(county, {
      sites: prior.sites + sites,
      capacity: prior.capacity === null || !Number.isFinite(capacity) ? null : prior.capacity + capacity,
    });
  }
  return out;
}

export function parseColoradoChildCareStats(payload: unknown): Map<string, { sites: number; capacity: number | null }> {
  const out = new Map<string, { sites: number; capacity: number | null }>();
  if (!Array.isArray(payload)) throw new Error("Colorado child-care statistics returned no rows");
  for (const row of payload) {
    if (!isRecord(row) || typeof row.county !== "string") continue;
    const county = countyKey(row.county);
    const sites = Number(row.sites);
    const capacity = row.capacity === undefined ? NaN : Number(row.capacity);
    if (!county || !Number.isFinite(sites) || sites < 0) continue;
    out.set(county, { sites, capacity: Number.isFinite(capacity) && capacity >= 0 ? capacity : null });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Network collection
// ---------------------------------------------------------------------------

export const defaultFetchText: FetchText = async (url, signal) => {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    headers: { "user-agent": "ClearStepsResearch/1.0 (+public county data joins)", accept: "application/json,text/csv,*/*" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new Error("response too large");
  if (!response.body) return response.text();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error("response too large"); }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
};

export function censusUrl(path: string, params: Record<string, string> | URLSearchParams) {
  const search = new URLSearchParams(params);
  const key = process.env.CENSUS_API_KEY?.trim();
  if (key) search.set("key", key);
  return `${CENSUS_API}/${path}?${search.toString()}`;
}

export async function firstWorking<T, R>(
  options: readonly T[],
  attempt: (option: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<{ option: T; result: R }> {
  const errors: string[] = [];
  for (const option of options) {
    // Out of time: stop trying older vintages rather than queueing requests that cannot finish.
    if (signal?.aborted) throw Object.assign(new Error("timed out"), { name: "AbortError" });
    try {
      return { option, result: await attempt(option) };
    } catch (error) {
      errors.push(errorText(error));
    }
  }
  throw new Error(errors.join("; ") || "no attempts");
}

export interface CollectOptions {
  fetchText?: FetchText;
  /** Overall budget for the whole state; slower sources are reported unavailable. */
  timeoutMs?: number;
}

export async function collectStateCountyBundle(state: JoinState, options: CollectOptions = {}): Promise<StateCountyBundle> {
  const fetchText = options.fetchText ?? defaultFetchText;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 22_000);
  const signal = controller.signal;
  const stateFips = STATE_FIPS[state];
  const geo = { for: "county:*", in: `state:${stateFips}` };
  const get = (url: string) => fetchText(url, signal);
  const frames = new Map<string, CountyFrame>();
  const programs: ProgramStatus[] = [];
  const integrityIssues: string[] = [];

  const apply = (patch: MetricPatch) => {
    for (const [fips, entry] of patch) {
      const frame = frames.get(fips) ?? { state, fips, name: entry.name ?? fips, metrics: {} };
      if (entry.name && (frame.name === fips || (!frame.name.includes(",") && entry.name.includes(",")))) frame.name = entry.name;
      Object.assign(frame.metrics, entry.metrics);
      frames.set(fips, frame);
    }
  };

  const acs = (async () => {
    const { option: year, result: first } = await firstWorking(ACS_YEARS, async (year) =>
      parseCensusTable(await get(censusUrl(`${year}/acs/acs5`, { get: ["NAME", ...ACS_BATCHES[0]].join(","), ...geo }))), signal);
    const [second, prior] = await Promise.allSettled([
      get(censusUrl(`${year}/acs/acs5`, { get: ["NAME", ...ACS_BATCHES[1]].join(","), ...geo })).then(parseCensusTable),
      get(censusUrl(`${ACS_PRIOR_YEAR}/acs/acs5`, { get: "NAME,B09001_001E", ...geo })).then(parseCensusTable),
    ]);
    const merged = new Map<string, Row>();
    for (const row of first) { const fips = rowFips(row); if (fips) merged.set(fips, { ...row }); }
    if (second.status === "fulfilled") for (const row of second.value) {
      const fips = rowFips(row);
      if (fips && merged.has(fips)) Object.assign(merged.get(fips)!, row);
    }
    const patch: MetricPatch = new Map();
    for (const [fips, row] of merged) {
      const { metrics, issues } = acsMetricsFromRow(row);
      if (issues.length) integrityIssues.push(...issues.map((issue) => `${row.NAME || fips}: ${issue}`));
      patch.set(fips, { name: row.NAME, metrics });
    }
    if (prior.status === "fulfilled") for (const row of prior.value) {
      const fips = rowFips(row);
      const kids = count(row, "B09001_001E");
      if (fips && kids !== undefined && patch.has(fips)) patch.get(fips)!.metrics["acs.kids_prior"] = kids;
    }
    apply(patch);
    const partial = [second.status === "rejected" ? "second variable batch failed" : null, prior.status === "rejected" ? `${ACS_PRIOR_YEAR} vintage failed` : null].filter(Boolean);
    return { vintage: `${year - 4}–${year}`, detail: `${merged.size} counties${partial.length ? "; " + partial.join("; ") : ""}` };
  })();

  const saipe = (async () => {
    const { option: year, result } = await firstWorking(SAIPE_YEARS, async (year) =>
      parseCensusTable(await get(censusUrl("timeseries/poverty/saipe", { get: "NAME,SAEPOVRT0_17_PT,SAEMHI_PT", ...geo, time: String(year) }))), signal);
    const patch = parseSaipeRows(result);
    if (!patch.size) throw new Error("no county rows");
    apply(patch);
    return { vintage: String(year), detail: `${patch.size} counties` };
  })();

  const sahie = (async () => {
    const { option: year, result } = await firstWorking(SAHIE_YEARS, async (year) =>
      parseCensusTable(await get(censusUrl("timeseries/healthins/sahie", {
        get: "NAME,NIC_PT,NUI_PT,PCTUI_PT", ...geo, time: String(year), AGECAT: "4", IPRCAT: "0", SEXCAT: "0", RACECAT: "0",
      }))), signal);
    const patch = parseSahieRows(result);
    if (!patch.size) throw new Error("no county rows");
    apply(patch);
    return { vintage: String(year), detail: `${patch.size} counties, children under 19` };
  })();

  const cbp = (async () => {
    const fetchNaics = (config: (typeof CBP_CONFIGS)[number], naics: string) =>
      get(censusUrl(`${config.year}/cbp`, { get: "NAME,ESTAB", ...geo, [config.field]: naics })).then(parseCensusTable);
    const [anchor, ...rest] = CBP_NAICS;
    const { option: config, result: anchorRows } = await firstWorking(CBP_CONFIGS, (option) => fetchNaics(option, anchor.naics), signal);
    const settled = await Promise.allSettled(rest.map((item) => fetchNaics(config, item.naics)));
    const results = [{ item: anchor, rows: anchorRows as Row[] | null }, ...rest.map((item, index) => ({
      item, rows: settled[index].status === "fulfilled" ? (settled[index] as PromiseFulfilledResult<Row[]>).value : null,
    }))];
    const failed = results.filter((entry) => !entry.rows).map((entry) => entry.item.naics);
    const perNaics = results.flatMap(({ item, rows }) => rows ? [{ item, parsed: parseCbpRows(rows) }] : []);
    return {
      vintage: String(config.year),
      detail: `${CBP_NAICS.length - failed.length}/${CBP_NAICS.length} NAICS categories (${config.field})${failed.length ? "; failed " + failed.join(", ") : ""}`,
      perNaics,
    };
  })();

  const tiger = (async () => {
    let layer = 1;
    try {
      layer = tigerCountyLayerId(JSON.parse(await get(`${TIGER_SERVICE}?f=json`))) ?? 1;
    } catch { /* fall back to the documented Counties layer */ }
    const params = new URLSearchParams({
      where: `STATE='${stateFips}'`,
      outFields: "GEOID,STATE,COUNTY,NAME,AREALAND,CENTLAT,CENTLON",
      returnGeometry: "false",
      f: "json",
    });
    const patch = parseTigerCounties(JSON.parse(await get(`${TIGER_SERVICE}/${layer}/query?${params.toString()}`)), stateFips);
    if (!patch.size) throw new Error("no county features");
    apply(patch);
    return { vintage: "current", detail: `${patch.size} county boundaries (land area + centroid)` };
  })();

  const hpsa = (async () => {
    const scores = parseHpsaMentalHealthCsv(await get(HRSA_MH_HPSA_CSV), stateFips);
    if (!scores) throw new Error("no recognisable mental-health HPSA rows for this state");
    return { scores, vintage: "current", detail: `${scores.size} counties with an active geographic/population designation` };
  })();

  const licensing = (async () => {
    if (state === "MO") {
      const params = new URLSearchParams({
        f: "json",
        where: "STATE = 'MO'",
        groupByFieldsForStatistics: "COUNTY,STATUS",
        outStatistics: JSON.stringify([
          { statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "SITES" },
          { statisticType: "sum", onStatisticField: "TOTAL", outStatisticFieldName: "CAPACITY" },
        ]),
        returnGeometry: "false",
      });
      return { stats: parseMissouriChildCareStats(JSON.parse(await get(`${MISSOURI_CHILD_CARE_LAYER_URL}/query?${params.toString()}`))), label: "MO DHSS" };
    }
    if (state === "CO") {
      const { result } = await firstWorking([
        "county, count(provider_id) as sites, sum(total_licensed_capacity) as capacity",
        "county, count(provider_id) as sites",
      ], async (select) => {
        const params = new URLSearchParams({ $select: select, $where: "state = 'CO'", $group: "county", $limit: "500" });
        return parseColoradoChildCareStats(JSON.parse(await get(`${COLORADO_CHILDCARE_API}?${params.toString()}`)));
      }, signal);
      return { stats: result, label: "CO CDEC" };
    }
    return null;
  })();

  const [acsR, saipeR, sahieR, cbpR, tigerR, hpsaR, licR] = await Promise.allSettled([acs, saipe, sahie, cbp, tiger, hpsa, licensing]);
  clearTimeout(timer);

  const record = (program: ProgramId, result: PromiseSettledResult<{ vintage: string; detail: string } | null>) => {
    if (result.status === "fulfilled" && result.value) programs.push({ program, status: "complete", vintage: result.value.vintage, detail: result.value.detail });
    else if (result.status === "rejected") programs.push({ program, status: "unavailable", vintage: null, detail: errorText(result.reason) });
  };
  record("census-acs5", acsR);
  record("census-saipe", saipeR);
  record("census-sahie", sahieR);
  if (cbpR.status === "fulfilled") {
    // A successful statewide response that omits a county means zero employer establishments there.
    const counties = new Set(frames.keys());
    for (const entry of cbpR.value.perNaics) for (const fips of entry.parsed.keys()) counties.add(fips);
    const patch: MetricPatch = new Map();
    for (const fips of counties) {
      const target: { name?: string; metrics: Partial<Record<MetricId, number>> } = { metrics: {} };
      for (const entry of cbpR.value.perNaics) {
        const found = entry.parsed.get(fips);
        target.metrics[entry.item.metric] = found?.estab ?? 0;
        target.name ??= found?.name;
      }
      patch.set(fips, target);
    }
    apply(patch);
  }
  record("census-cbp", cbpR);
  record("census-tiger", tigerR);

  // HPSA: counties absent from a successfully parsed state file have no active designation (score 0).
  if (hpsaR.status === "fulfilled") {
    for (const frame of frames.values()) frame.metrics["hrsa.mh_hpsa_score"] = hpsaR.value.scores.get(frame.fips) ?? 0;
  }
  record("hrsa-hpsa-mh", hpsaR);

  if (licR.status === "fulfilled" && licR.value) {
    const byKey = new Map([...frames.values()].map((frame) => [countyKey(frame.name), frame]));
    let matched = 0;
    for (const [key, value] of licR.value.stats) {
      const frame = byKey.get(key);
      if (!frame) continue;
      matched++;
      frame.metrics["lic.childcare_sites"] = value.sites;
      if (value.capacity !== null) frame.metrics["lic.childcare_capacity"] = value.capacity;
    }
    // Counties with no licensed rows in a successful statewide roster have zero licensed sites.
    for (const frame of frames.values()) if (frame.metrics["lic.childcare_sites"] === undefined && matched > 0) frame.metrics["lic.childcare_sites"] = 0;
    programs.push(matched > 0
      ? { program: "state-childcare-licensing", status: "complete", vintage: "current", detail: `${licR.value.label}: ${matched} counties matched by name` }
      : { program: "state-childcare-licensing", status: "unavailable", vintage: null, detail: `${licR.value.label}: no county names matched Census counties` });
  } else if (licR.status === "fulfilled") {
    programs.push({ program: "state-childcare-licensing", status: "not_applicable", vintage: null, detail: `No statewide licensed child-care roster integrated for ${state}; County Business Patterns child-care establishments are used instead` });
  } else {
    programs.push({ program: "state-childcare-licensing", status: "unavailable", vintage: null, detail: errorText(licR.reason) });
  }

  return {
    state,
    capturedAt: new Date().toISOString(),
    frames: [...frames.values()].filter((frame) => /^\d{5}$/.test(frame.fips)).sort((a, b) => a.name.localeCompare(b.name)),
    programs,
    integrityIssues,
  };
}

const CACHE = new Map<JoinState, { at: number; ttl: number; bundle: Promise<StateCountyBundle> }>();
const FULL_TTL = 12 * 60 * 60 * 1000;
const PARTIAL_TTL = 30 * 60 * 1000;

/** Cached per server instance: public statistical releases change at most a few times a year. */
export function getStateCountyBundle(state: JoinState, options: CollectOptions & { force?: boolean } = {}): Promise<StateCountyBundle> {
  const cached = CACHE.get(state);
  if (!options.force && cached && Date.now() - cached.at < cached.ttl) return cached.bundle;
  const entry = { at: Date.now(), ttl: PARTIAL_TTL, bundle: collectStateCountyBundle(state, options) };
  CACHE.set(state, entry);
  entry.bundle.then((bundle) => {
    entry.ttl = bundle.programs.every((program) => program.status !== "unavailable") ? FULL_TTL : PARTIAL_TTL;
  }, () => CACHE.delete(state));
  return entry.bundle;
}

export function upperKeys(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toUpperCase(), value]));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function errorText(error: unknown) {
  if (error instanceof Error) return error.name === "AbortError" ? "timed out" : error.message;
  return String(error);
}
