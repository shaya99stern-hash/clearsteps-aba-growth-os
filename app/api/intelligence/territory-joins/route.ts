import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStateCountyBundle } from "@/lib/intelligence/joins/collectors";
import { DATA_JOINS, JOIN_FAMILIES, joinPrograms } from "@/lib/intelligence/joins/join-catalog";
import { rankStateCounties } from "@/lib/intelligence/joins/rank";
import { PROGRAMS } from "@/lib/intelligence/joins/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUERY = z.object({
  state: z.enum(["MO", "KS", "CO"]),
  refresh: z.enum(["0", "1"]).optional(),
});

/**
 * Ranks every county in a state with 90 cross-program data joins (52 run without a Census API key).
 * Area-level public statistics only: no family, child or household records exist in this pipeline.
 */
export async function GET(request: NextRequest) {
  const parsed = QUERY.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Choose Missouri (MO), Kansas (KS) or Colorado (CO)." }, { status: 400 });
  }
  const bundle = await getStateCountyBundle(parsed.data.state, { force: parsed.data.refresh === "1" });
  const ranking = rankStateCounties(bundle);

  return NextResponse.json({
    ok: true,
    state: ranking.state,
    capturedAt: ranking.capturedAt,
    totals: ranking.totals,
    programs: ranking.programs.map((program) => ({ ...program, ...PROGRAMS[program.program] })),
    integrityIssues: ranking.integrityIssues.slice(0, 25),
    families: JOIN_FAMILIES,
    catalog: DATA_JOINS.map((join) => ({
      id: join.id, family: join.family, title: join.title, rationale: join.rationale, formula: join.formula,
      unit: join.unit, opportunity: join.opportunity, programs: joinPrograms(join), indicator: join.indicator?.id ?? null,
    })),
    counties: ranking.counties.map((county) => ({
      fips: county.fips,
      name: county.name,
      rank: county.rank,
      rankedOf: county.rankedOf,
      score: county.score,
      confidence: county.confidence,
      coverage: county.coverage,
      computedJoins: county.computedJoins,
      agreement: county.agreement,
      children: county.children,
      lowSample: county.lowSample,
      drivers: county.drivers,
      cautions: county.cautions,
      familyScores: county.familyScores,
      // Compact per-join tuples: [id, raw value, opportunity percentile, agreement, missing programs]
      joins: county.joins.map((join) => [join.id, round(join.raw), join.percentile, join.agreement, join.missing] as const),
    })),
  });
}

function round(value: number | null) {
  return value === null ? null : Math.round(value * 1000) / 1000;
}
