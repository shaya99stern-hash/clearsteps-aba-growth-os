import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStateCountyBundle } from "@/lib/intelligence/joins/collectors";
import { rankStateCounties } from "@/lib/intelligence/joins/rank";
import { getStateTracts } from "@/lib/intelligence/geo/tracts";
import { collectSitePlaces } from "@/lib/intelligence/geo/places";
import { analyzeSite, formatAgeRange, INDICATOR_FAMILY_TITLES, CDC_PREVALENCE_SOURCE } from "@/lib/intelligence/geo/site-analysis";
import { insideState } from "@/lib/intelligence/geo/geo-math";
import { enrichPublicWebsite } from "@/lib/intelligence/free-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUERY = z.object({
  state: z.enum(["MO", "KS", "CO"]),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/**
 * 2 / 5 / 10-mile analysis around a point chosen on the map: 202 indicators, child-care tiers,
 * organization pins and cross-source convergence tests. Organizations and area aggregates only.
 */
export async function GET(request: NextRequest) {
  const parsed = QUERY.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Provide state, lat and lon." }, { status: 400 });
  const { state, lat, lon } = parsed.data;
  const center = { lat, lon };
  if (!insideState(state, center)) return NextResponse.json({ ok: false, error: `That point is outside ${state}.` }, { status: 400 });

  const [tractsR, bundleR, placesR] = await Promise.allSettled([
    getStateTracts(state),
    getStateCountyBundle(state),
    collectSitePlaces(state, center, { enrichWebsite: enrichPublicWebsite }),
  ]);
  const places = placesR.status === "fulfilled" ? placesR.value : { center, radiusMiles: 10, places: [], zipCounts: [], sources: [{ source: "Facility collectors", status: "unavailable" as const, detail: String(placesR.reason) }] };
  const bundle = bundleR.status === "fulfilled" ? bundleR.value : null;
  const analysis = analyzeSite(center, {
    tracts: tractsR.status === "fulfilled" ? tractsR.value.tracts : [],
    places,
    counties: bundle?.frames ?? [],
    countyReports: bundle ? rankStateCounties(bundle).counties : [],
  });

  return NextResponse.json({
    ok: true,
    state,
    familyTitles: INDICATOR_FAMILY_TITLES,
    prevalenceSource: CDC_PREVALENCE_SOURCE,
    ...analysis,
    places: places.places.map((place) => ({
      id: place.id, kind: place.kind, name: place.name, lat: place.lat, lon: place.lon, approximate: place.approximate,
      address: place.address ?? null, city: place.city ?? null, phone: place.phone ?? null, website: place.website ?? null,
      sources: place.sources, licensed: Boolean(place.licensed), capacity: place.capacity ?? null, distanceMiles: place.distanceMiles ?? null,
    })),
    daycares: analysis.daycares.map((item) => ({
      id: item.place.id, name: item.place.name, tier: item.tier, distanceMiles: item.place.distanceMiles ?? null,
      capacity: item.place.capacity ?? null, phone: item.place.phone ?? null, address: item.place.address ?? null, city: item.place.city ?? null,
      website: item.place.website ?? null, ages: item.place.minAgeYears != null && item.place.maxAgeYears != null ? formatAgeRange(item.place.minAgeYears, item.place.maxAgeYears) : null,
      confirmedBy: item.confirmedBy, servesTargetAges: item.servesTargetAges, reasons: item.reasons,
      expectedAutisticAtCapacity: item.expectedAutisticAtCapacity, expectedWithDisabilityAtCapacity: item.expectedWithDisabilityAtCapacity,
    })),
    sources: [
      ...places.sources,
      ...(tractsR.status === "fulfilled" ? tractsR.value.programs.map((p) => ({ source: p.program + " (tracts)", status: p.status, detail: p.detail })) : [{ source: "census tracts", status: "unavailable", detail: String(tractsR.reason) }]),
    ],
  });
}
