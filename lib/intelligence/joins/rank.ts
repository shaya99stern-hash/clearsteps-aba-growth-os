import type { IndicatorObservation } from "../phase3/indicator-catalog";
import { countyKey, type CountyFrame, type ProgramStatus, type StateCountyBundle } from "./collectors";
import { DATA_JOINS, JOIN_FAMILIES, joinPrograms, type JoinDefinition, type JoinFamily } from "./join-catalog";
import { metricProgram, STATE_NAMES, type JoinState, type MetricId, type ProgramId } from "./sources";

/** Counties with fewer children than this have wide ACS margins of error; their results are flagged and discounted. */
export const LOW_SAMPLE_CHILDREN = 1_000;
/** A county is ranked only when at least this share of the opportunity joins could be computed. */
export const MIN_RANKING_COVERAGE = 50;
const MIN_COUNTIES_FOR_PERCENTILE = 5;
const MAX_CONFIDENCE = 85;

export interface JoinResult {
  id: string;
  family: JoinFamily;
  title: string;
  unit: string;
  status: "computed" | "insufficient_data";
  raw: number | null;
  /** Within-state opportunity percentile, 0–100 (higher = more opportunity). Null for validation joins. */
  percentile: number | null;
  /** 0–100 agreement between two independent programs (validation joins only). */
  agreement: number | null;
  programs: ProgramId[];
  /** Programs whose metrics were unavailable for this county. */
  missing: ProgramId[];
  lowSample: boolean;
}

export interface CountyJoinReport {
  state: JoinState;
  fips: string;
  name: string;
  rank: number | null;
  rankedOf: number;
  score: number | null;
  confidence: number;
  coverage: number;
  computedJoins: number;
  opportunityJoins: number;
  agreement: number | null;
  children: number | null;
  lowSample: boolean;
  drivers: string[];
  cautions: string[];
  familyScores: Array<{ family: JoinFamily; title: string; score: number | null; computed: number; total: number }>;
  joins: JoinResult[];
  observations: IndicatorObservation[];
}

export interface StateJoinRanking {
  state: JoinState;
  capturedAt: string;
  programs: ProgramStatus[];
  integrityIssues: string[];
  counties: CountyJoinReport[];
  totals: { counties: number; ranked: number; joins: number; crossProgramJoins: number };
}

const OPPORTUNITY_JOINS = DATA_JOINS.filter((join) => join.opportunity !== "agreement");

function safeCompute(join: JoinDefinition, frame: CountyFrame, frames: readonly CountyFrame[]): number | null {
  try {
    const value = join.compute(frame.metrics, { self: frame, frames });
    return value !== null && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function percentileRank(values: readonly number[], value: number) {
  const below = values.filter((item) => item < value).length;
  const equal = values.filter((item) => item === value).length;
  return ((below + equal / 2) / values.length) * 100;
}

export function formatJoinValue(value: number | null): string {
  if (value === null) return "—";
  const abs = Math.abs(value);
  if (abs < 1) return value.toFixed(2);
  if (abs < 100) return value.toFixed(1);
  return Math.round(value).toLocaleString("en-US");
}

function describe(result: JoinResult, state: JoinState, high: boolean) {
  const pct = Math.round(result.percentile ?? 0);
  const position = high ? `top ${Math.max(1, 100 - pct)}%` : `bottom ${Math.max(1, pct)}%`;
  return `${result.title}: ${formatJoinValue(result.raw)} ${result.unit} (${position} of ${STATE_NAMES[state]} counties)`;
}

export function rankStateCounties(bundle: StateCountyBundle): StateJoinRanking {
  const { frames, state } = bundle;
  const applicablePrograms = bundle.programs.filter((program) => program.status !== "not_applicable");
  const programShare = applicablePrograms.length
    ? (applicablePrograms.filter((program) => program.status === "complete").length / applicablePrograms.length) * 100
    : 0;

  const raw = new Map<string, Map<string, number | null>>();
  for (const join of DATA_JOINS) {
    raw.set(join.id, new Map(frames.map((frame) => [frame.fips, safeCompute(join, frame, frames)])));
  }
  const distributions = new Map<string, number[]>();
  for (const join of OPPORTUNITY_JOINS) {
    distributions.set(join.id, [...raw.get(join.id)!.values()].filter((value): value is number => value !== null));
  }

  const reports: CountyJoinReport[] = frames.map((frame) => {
    const children = frame.metrics["acs.kids"] ?? null;
    const lowSample = children !== null && children < LOW_SAMPLE_CHILDREN;
    const joins: JoinResult[] = DATA_JOINS.map((join) => {
      const value = raw.get(join.id)!.get(frame.fips) ?? null;
      const programs = joinPrograms(join);
      const missing = [...new Set(join.metrics.filter((metric) => frame.metrics[metric] === undefined).map(metricProgram))];
      let percentile: number | null = null;
      let agreement: number | null = null;
      if (value !== null && join.opportunity === "agreement") agreement = value;
      else if (value !== null) {
        const distribution = distributions.get(join.id)!;
        if (distribution.length >= MIN_COUNTIES_FOR_PERCENTILE) {
          const pct = percentileRank(distribution, value);
          percentile = Math.round(join.opportunity === "higher" ? pct : 100 - pct);
        }
      }
      const computed = join.opportunity === "agreement" ? agreement !== null : percentile !== null;
      return {
        id: join.id, family: join.family, title: join.title, unit: join.unit,
        status: computed ? "computed" : "insufficient_data",
        raw: value, percentile, agreement, programs, missing, lowSample,
      };
    });

    const opportunity = joins.filter((result) => result.percentile !== null);
    const familyScores = (Object.keys(JOIN_FAMILIES) as JoinFamily[]).filter((family) => family !== "validation").map((family) => {
      const members = joins.filter((result) => result.family === family);
      const scored = members.filter((result) => result.percentile !== null);
      return {
        family, title: JOIN_FAMILIES[family].title,
        score: scored.length ? Math.round(scored.reduce((sum, item) => sum + item.percentile!, 0) / scored.length) : null,
        computed: scored.length, total: members.length,
      };
    });
    const weighted = opportunity.reduce((acc, result) => {
      const weight = JOIN_FAMILIES[result.family].weight;
      return { sum: acc.sum + result.percentile! * weight, weight: acc.weight + weight };
    }, { sum: 0, weight: 0 });
    const coverage = Math.round((opportunity.length / OPPORTUNITY_JOINS.length) * 100);
    const agreements = joins.filter((result) => result.agreement !== null).map((result) => result.agreement!);
    const agreement = agreements.length ? Math.round(agreements.reduce((a, b) => a + b, 0) / agreements.length) : null;
    // Capped: complete, agreeing data still rests on proxies (NAICS 621330 is not ABA-only), so it is never near-certain.
    const confidence = Math.min(MAX_CONFIDENCE, clamp(Math.round(0.45 * coverage + 0.35 * (agreement ?? 50) + 0.2 * programShare) - (lowSample ? 15 : 0)));
    const score = coverage >= MIN_RANKING_COVERAGE && weighted.weight > 0 ? Math.round(weighted.sum / weighted.weight) : null;

    const sorted = [...opportunity].sort((a, b) => b.percentile! - a.percentile!);
    const drivers = sorted.filter((result) => result.percentile! >= 70).slice(0, 3).map((result) => describe(result, state, true));
    const cautions = [
      ...sorted.filter((result) => result.percentile! <= 30).slice(-2).reverse().map((result) => describe(result, state, false)),
      ...(lowSample ? [`Fewer than ${LOW_SAMPLE_CHILDREN.toLocaleString("en-US")} children: survey margins of error are wide`] : []),
      ...(agreement !== null && agreement < 60 ? [`Independent sources disagree (agreement ${agreement}/100): verify locally before acting`] : []),
    ];

    return {
      state, fips: frame.fips, name: frame.name, rank: null, rankedOf: 0,
      score, confidence, coverage, computedJoins: joins.filter((result) => result.status === "computed").length,
      opportunityJoins: OPPORTUNITY_JOINS.length, agreement, children, lowSample,
      drivers, cautions, familyScores, joins,
      observations: [],
    };
  });

  // Direct single-program ACS indicators use the same within-state percentile scale.
  const directIndicators: Array<{ id: string; fn: (m: CountyFrame["metrics"]) => number | null }> = [
    { id: "demographic-demand.01", fn: (m) => m["acs.kids_u3"] ?? null },
    { id: "demographic-demand.05", fn: (m) => ratio(m, "acs.kids", "acs.pop") },
    { id: "demographic-demand.06", fn: (m) => m["acs.kids"] !== undefined && (m["acs.kids_prior"] ?? 0) > 0 ? (m["acs.kids"]! - m["acs.kids_prior"]!) / m["acs.kids_prior"]! : null },
    { id: "demographic-demand.09", fn: (m) => ratio(m, "acs.hh_kids", "acs.hh") },
  ];
  const directDistributions = directIndicators.map((item) => ({
    ...item, values: frames.map((frame) => item.fn(frame.metrics)).filter((value): value is number => value !== null && Number.isFinite(value)),
  }));
  const capturedAt = bundle.capturedAt;
  reports.forEach((report, index) => {
    report.observations = buildObservations(report, frames[index], directDistributions, capturedAt);
  });

  const ranked = reports.filter((report) => report.score !== null)
    .sort((a, b) => (b.score! - a.score!) || (b.confidence - a.confidence) || a.name.localeCompare(b.name));
  ranked.forEach((report, index) => { report.rank = index + 1; });
  for (const report of reports) report.rankedOf = ranked.length;
  const unranked = reports.filter((report) => report.score === null).sort((a, b) => a.name.localeCompare(b.name));

  return {
    state,
    capturedAt,
    programs: bundle.programs,
    integrityIssues: bundle.integrityIssues,
    counties: [...ranked, ...unranked],
    totals: {
      counties: reports.length,
      ranked: ranked.length,
      joins: DATA_JOINS.length,
      crossProgramJoins: DATA_JOINS.filter((join) => joinPrograms(join).length >= 2).length,
    },
  };
}

function buildObservations(
  report: CountyJoinReport,
  frame: CountyFrame,
  direct: ReadonlyArray<{ id: string; fn: (m: CountyFrame["metrics"]) => number | null; values: number[] }>,
  capturedAt: string,
): IndicatorObservation[] {
  const grouped = new Map<string, Array<{ value: number; confidence: number; sources: string[] }>>();
  const add = (id: string, value: number, confidence: number, sources: string[]) => {
    const list = grouped.get(id) ?? [];
    list.push({ value, confidence, sources });
    grouped.set(id, list);
  };
  const agreementBonus = report.agreement !== null && report.agreement >= 70 ? 8 : 0;
  const samplePenalty = report.lowSample ? 15 : 0;

  for (const join of DATA_JOINS) {
    if (!join.indicator) continue;
    const result = report.joins.find((item) => item.id === join.id);
    if (!result || result.percentile === null) continue;
    const value = join.indicator.value === "supply" ? 100 - result.percentile : result.percentile;
    const confidence = Math.max(30, Math.min(85, 50 + 8 * (result.programs.length - 1) + agreementBonus - samplePenalty));
    add(join.indicator.id, value, confidence, result.programs.map((program) => `${program}:${join.id}`));
  }
  for (const item of direct) {
    const value = item.fn(frame.metrics);
    if (value === null || !Number.isFinite(value) || item.values.length < MIN_COUNTIES_FOR_PERCENTILE) continue;
    add(item.id, Math.round(percentileRank(item.values, value)), Math.max(30, 80 - samplePenalty), ["census-acs5"]);
  }
  if (report.agreement !== null) add("evidence-quality.08", report.agreement, 80, ["county-data-joins:validation"]);

  return [...grouped.entries()].map(([indicatorId, items]) => ({
    indicatorId,
    value: Math.round(items.reduce((sum, item) => sum + item.value, 0) / items.length),
    confidence: Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length),
    sourceIds: [...new Set(items.flatMap((item) => item.sources))],
    capturedAt,
  }));
}

function ratio(m: CountyFrame["metrics"], part: MetricId, whole: MetricId) {
  const a = m[part];
  const b = m[whole];
  return a !== undefined && b !== undefined && b > 0 ? a / b : null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

/** Only a trailing state suffix is removed, so "Kansas City" and "Colorado Springs" keep their names. */
const STATE_SUFFIX = /(?:,\s*|\s+)(?:missouri|kansas|colorado|mo|ks|co)\.?\s*$/i;

/**
 * Strict geography match: a county is selected only when the request names a county
 * (or an independent city such as "St. Louis city"). A city name never borrows its county's numbers.
 */
export function selectCountyReport(ranking: StateJoinRanking, location: string):
  { report: CountyJoinReport | null; suggestions: string[] } {
  const cleaned = location.trim().replace(STATE_SUFFIX, " ").replace(/[,]+/g, " ").replace(/\s+/g, " ").trim();
  const key = countyKey(cleaned);
  const wantsCounty = /\bcounty\b/i.test(cleaned);
  const wantsIndependentCity = /\bcity\b/i.test(cleaned);
  if (key && (wantsCounty || wantsIndependentCity)) {
    const report = ranking.counties.find((county) => countyKey(county.name) === key) ?? null;
    if (report) return { report, suggestions: [] };
  }
  const base = countyKey(cleaned.replace(/\b(county|city)\b/gi, ""));
  const suggestions = base
    ? ranking.counties.filter((county) => countyKey(county.name).replace(/city$/, "") === base).map((county) => county.name.split(",")[0])
    : [];
  return { report: null, suggestions };
}
