import type { IndicatorObservation } from "../phase3/indicator-catalog";

const CURRENT_YEAR = 2024;
const PRIOR_YEAR = 2019;
const STATE_FIPS = { MO: "29", KS: "20" } as const;
const VARIABLES = [
  "NAME",
  "B01003_001E",
  "B09001_001E",
  "B09001_003E",
  "B09001_004E",
  "B09001_005E",
  "B09001_006E",
  "B09001_007E",
  "B09001_008E",
] as const;

type GeographyKind = "state" | "county" | "place" | "zcta";
type CensusRow = Record<string, string>;

export interface CensusDemographicsResult {
  geographyName: string;
  geographyKind: GeographyKind;
  year: number;
  metrics: {
    totalPopulation: number;
    under18: number;
    age0to2: number;
    age3to5: number;
    age6to11: number;
    age12to17: number;
    under18Share: number;
    under18FiveYearGrowth: number | null;
  };
  observations: IndicatorObservation[];
  sourceUrl: string;
}

export async function fetchCensusDemographics(input: { state: "MO" | "KS"; location: string }): Promise<CensusDemographicsResult> {
  const geography = await resolveGeography(input.state, input.location, CURRENT_YEAR);
  const current = await fetchRow(CURRENT_YEAR, geography);
  const prior = await fetchPriorUnder18(geography).catch(() => null);

  const totalPopulation = number(current.B01003_001E);
  const under18 = number(current.B09001_001E);
  const age0to2 = number(current.B09001_003E);
  const age3to5 = number(current.B09001_004E) + number(current.B09001_005E);
  const age6to11 = number(current.B09001_006E) + number(current.B09001_007E);
  const age12to17 = number(current.B09001_008E) + number(current.B09001_009E);
  const under18Share = totalPopulation > 0 ? (under18 / totalPopulation) * 100 : 0;
  const under18FiveYearGrowth = prior && prior > 0 ? ((under18 - prior) / prior) * 100 : null;

  const observations: IndicatorObservation[] = [
    observation("demographic-demand.01", absoluteDemandScore(age0to2, 7_500), 92, CURRENT_YEAR),
    observation("demographic-demand.02", absoluteDemandScore(age3to5, 7_500), 92, CURRENT_YEAR),
    observation("demographic-demand.03", absoluteDemandScore(age6to11, 15_000), 92, CURRENT_YEAR),
    observation("demographic-demand.04", absoluteDemandScore(age12to17, 15_000), 92, CURRENT_YEAR),
    observation("demographic-demand.05", scaleRange(under18Share, 12, 30), 90, CURRENT_YEAR),
  ];
  if (under18FiveYearGrowth !== null) {
    observations.push(observation("demographic-demand.06", scaleRange(under18FiveYearGrowth, -10, 12), 82, CURRENT_YEAR));
  }

  return {
    geographyName: current.NAME || geography.label,
    geographyKind: geography.kind,
    year: CURRENT_YEAR,
    metrics: { totalPopulation, under18, age0to2, age3to5, age6to11, age12to17, under18Share, under18FiveYearGrowth },
    observations,
    sourceUrl: `https://api.census.gov/data/${CURRENT_YEAR}/acs/acs5/groups/B09001.html`,
  };
}

async function resolveGeography(state: "MO" | "KS", location: string, year: number) {
  const stateFips = STATE_FIPS[state];
  const zip = location.match(/\b\d{5}\b/)?.[0];
  if (zip) return { kind: "zcta" as const, code: zip, stateFips, label: zip };

  const cleaned = normalizeLocation(location, state);
  if (!cleaned || /^(missouri|kansas|statewide)$/i.test(cleaned)) {
    return { kind: "state" as const, code: stateFips, stateFips, label: state };
  }

  if (/\bcounty\b/i.test(location)) {
    const rows = await fetchRows(year, `county:*`, `state:${stateFips}`);
    const match = bestNamedMatch(rows, cleaned.replace(/\bcounty\b/i, "").trim());
    if (!match?.county) throw new Error(`Census could not resolve county geography from "${location}".`);
    return { kind: "county" as const, code: match.county, stateFips, label: match.NAME || location };
  }

  const rows = await fetchRows(year, `place:*`, `state:${stateFips}`);
  const match = bestNamedMatch(rows, cleaned);
  if (match?.place) return { kind: "place" as const, code: match.place, stateFips, label: match.NAME || location };

  return { kind: "state" as const, code: stateFips, stateFips, label: state };
}

async function fetchRow(year: number, geography: Awaited<ReturnType<typeof resolveGeography>>) {
  if (geography.kind === "state") return first(await fetchRows(year, `state:${geography.code}`));
  if (geography.kind === "county") return first(await fetchRows(year, `county:${geography.code}`, `state:${geography.stateFips}`));
  if (geography.kind === "place") return first(await fetchRows(year, `place:${geography.code}`, `state:${geography.stateFips}`));
  return first(await fetchRows(year, `zip code tabulation area:${geography.code}`));
}

async function fetchPriorUnder18(geography: Awaited<ReturnType<typeof resolveGeography>>) {
  const row = await fetchRow(PRIOR_YEAR, geography);
  return number(row.B09001_001E);
}

async function fetchRows(year: number, forClause: string, inClause?: string): Promise<CensusRow[]> {
  const params = new URLSearchParams({ get: VARIABLES.join(","), for: forClause });
  if (inClause) params.set("in", inClause);
  const url = `https://api.census.gov/data/${year}/acs/acs5?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "ClearStepsResearch/1.0 (+public Census ACS)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Census ACS returned ${response.status}`);
    const payload = await response.json() as string[][];
    if (!Array.isArray(payload) || payload.length < 2) throw new Error("Census ACS returned no matching rows");
    const headers = payload[0];
    return payload.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  } finally {
    clearTimeout(timer);
  }
}

function bestNamedMatch(rows: CensusRow[], target: string) {
  const normalizedTarget = normalize(target);
  return rows
    .map((row) => ({ row, score: nameScore(normalize(row.NAME || ""), normalizedTarget) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.row;
}

function nameScore(name: string, target: string) {
  if (!target) return 0;
  const baseName = name.split(",")[0].replace(/\b(city|town|village|county|municipality)\b/g, "").trim();
  if (baseName === target) return 100;
  if (baseName.startsWith(target) || target.startsWith(baseName)) return 80;
  if (baseName.includes(target) || target.includes(baseName)) return 55;
  return 0;
}

function normalizeLocation(value: string, state: "MO" | "KS") {
  return value
    .replace(new RegExp(`\\b(${state === "MO" ? "Missouri|MO" : "Kansas|KS"})\\b`, "gi"), "")
    .replace(/[,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function observation(indicatorId: string, value: number, confidence: number, year: number): IndicatorObservation {
  return { indicatorId, value, confidence, sourceIds: [`census-acs5-${year}`], capturedAt: new Date().toISOString() };
}

function absoluteDemandScore(value: number, strongAt: number) {
  if (value <= 0) return 0;
  return clamp(Math.round((Math.log1p(value) / Math.log1p(strongAt)) * 100));
}

function scaleRange(value: number, low: number, high: number) {
  if (high <= low) return 0;
  return clamp(Math.round(((value - low) / (high - low)) * 100));
}

function first(rows: CensusRow[]) {
  const row = rows[0];
  if (!row) throw new Error("Census ACS returned no matching row");
  return row;
}

function number(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
