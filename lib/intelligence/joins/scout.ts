import type { IndicatorObservation } from "../phase3/indicator-catalog";
import type { StateCountyBundle } from "./collectors";
import { DATA_JOINS } from "./join-catalog";
import { rankStateCounties, selectCountyReport } from "./rank";
import { PROGRAMS } from "./sources";

export interface ScoutDataJoins {
  status: "county_matched" | "county_required" | "unavailable";
  note: string;
  county: {
    name: string; fips: string; rank: number | null; rankedOf: number; score: number | null;
    confidence: number; coverage: number; computedJoins: number; agreement: number | null;
    drivers: string[]; cautions: string[];
    familyScores: Array<{ family: string; title: string; score: number | null; computed: number; total: number }>;
    joins: Array<{ id: string; title: string; family: string; unit: string; status: string; raw: number | null; percentile: number | null; agreement: number | null }>;
  } | null;
  suggestions: string[];
  topCounties: Array<{ name: string; rank: number; score: number; confidence: number }>;
  programs: Array<{ label: string; status: string; detail: string }>;
}

/** Summarises the statewide county joins for one Scout request and returns its indicator observations. */
export function scoutDataJoins(bundle: StateCountyBundle, location: string): { dataJoins: ScoutDataJoins; observations: IndicatorObservation[] } {
  const ranking = rankStateCounties(bundle);
  const { report, suggestions } = selectCountyReport(ranking, location);
  const programs = ranking.programs.map((program) => ({ label: PROGRAMS[program.program].label, status: program.status, detail: program.detail }));
  const topCounties = ranking.counties.filter((county) => county.rank !== null).slice(0, 5)
    .map((county) => ({ name: county.name, rank: county.rank!, score: county.score!, confidence: county.confidence }));

  if (!ranking.totals.counties) {
    return {
      dataJoins: { status: "unavailable", note: "Public statistical programs did not respond; no county joins were computed.", county: null, suggestions: [], topCounties: [], programs },
      observations: [],
    };
  }
  if (!report) {
    return {
      dataJoins: {
        status: "county_required",
        note: "County data joins use county statistics. Enter a county (for example \"Clay County\") to score this area; a city never borrows its county's numbers.",
        county: null, suggestions, topCounties, programs,
      },
      observations: [],
    };
  }
  const titles = new Map(DATA_JOINS.map((join) => [join.id, join]));
  return {
    dataJoins: {
      status: "county_matched",
      note: "Within-state percentiles across " + ranking.totals.counties + " counties. Proxies for unmet demand and referral leverage, not confirmed waitlists or eligibility.",
      county: {
        name: report.name, fips: report.fips, rank: report.rank, rankedOf: report.rankedOf, score: report.score,
        confidence: report.confidence, coverage: report.coverage, computedJoins: report.computedJoins, agreement: report.agreement,
        drivers: report.drivers, cautions: report.cautions, familyScores: report.familyScores,
        joins: report.joins.map((join) => ({
          id: join.id, title: join.title, family: join.family, unit: titles.get(join.id)?.unit ?? join.unit,
          status: join.status, raw: join.raw, percentile: join.percentile, agreement: join.agreement,
        })),
      },
      suggestions: [], topCounties, programs,
    },
    observations: report.observations,
  };
}
