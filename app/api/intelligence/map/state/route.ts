import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStateCountyBundle } from "@/lib/intelligence/joins/collectors";
import { rankStateCounties } from "@/lib/intelligence/joins/rank";
import { getStateTracts, tractHotspots } from "@/lib/intelligence/geo/tracts";
import { STATE_BOUNDS } from "@/lib/intelligence/geo/geo-math";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUERY = z.object({ state: z.enum(["MO", "KS", "CO"]) });

/** Statewide map layers: county opportunity bubbles and census-tract hotspots (area aggregates only). */
export async function GET(request: NextRequest) {
  const parsed = QUERY.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Choose MO, KS or CO." }, { status: 400 });
  const { state } = parsed.data;
  const [bundleR, tractsR] = await Promise.allSettled([getStateCountyBundle(state), getStateTracts(state)]);
  const ranking = bundleR.status === "fulfilled" ? rankStateCounties(bundleR.value) : null;
  const frames = bundleR.status === "fulfilled" ? new Map(bundleR.value.frames.map((frame) => [frame.fips, frame])) : new Map();
  const serviceGap = new Map<string, number>();
  for (const county of ranking?.counties ?? []) {
    const j01 = county.joins.find((join) => join.id === "J01")?.percentile;
    if (j01 != null) serviceGap.set(county.fips, j01);
  }
  const tracts = tractsR.status === "fulfilled" ? tractsR.value : null;
  const hotspots = tracts ? tractHotspots(tracts.tracts, serviceGap) : [];
  const r4 = (value: number) => Math.round(value * 10_000) / 10_000;

  return NextResponse.json({
    ok: true,
    state,
    view: STATE_BOUNDS[state],
    counties: (ranking?.counties ?? []).flatMap((county) => {
      const metrics = frames.get(county.fips)?.metrics;
      if (metrics?.["tiger.lat"] === undefined || metrics?.["tiger.lon"] === undefined) return [];
      return [{
        fips: county.fips, name: county.name.split(",")[0], lat: r4(metrics["tiger.lat"]), lon: r4(metrics["tiger.lon"]),
        score: county.score, rank: county.rank, rankedOf: county.rankedOf, confidence: county.confidence, children: county.children,
        driver: county.drivers[0] ?? null,
      }];
    }),
    hotspots: hotspots.map((spot) => ({ g: spot.geoid, la: r4(spot.lat), lo: r4(spot.lon), k: spot.kidsUnder6, s: spot.score, sm: spot.smallSample })),
    sources: [
      ...(bundleR.status === "fulfilled" ? bundleR.value.programs.map((p) => ({ source: p.program, status: p.status, detail: p.detail })) : [{ source: "county joins", status: "unavailable", detail: String(bundleR.reason) }]),
      ...(tracts ? tracts.programs.map((p) => ({ source: p.program + " (tracts)", status: p.status, detail: p.detail })) : [{ source: "census tracts", status: "unavailable", detail: tractsR.status === "rejected" ? String(tractsR.reason) : "" }]),
    ],
  });
}
