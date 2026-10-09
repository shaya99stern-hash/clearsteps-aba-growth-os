import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { insideState } from "@/lib/intelligence/geo/geo-math";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const QUERY = z.object({ state: z.enum(["MO", "KS", "CO"]), q: z.string().trim().min(4).max(200) });

/** Geocodes an address the operator typed (e.g. a clinic or candidate site) with the keyless Census geocoder. */
export async function GET(request: NextRequest) {
  const parsed = QUERY.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter an address, city or ZIP." }, { status: 400 });
  const { state, q } = parsed.data;
  const address = /\b(MO|KS|CO|Missouri|Kansas|Colorado)\b/i.test(q) ? q : `${q}, ${state}`;
  const params = new URLSearchParams({ address, benchmark: "Public_AR_Current", format: "json" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Census geocoder returned ${response.status}`);
    const payload = await response.json() as { result?: { addressMatches?: Array<{ matchedAddress?: string; coordinates?: { x?: number; y?: number } }> } };
    const match = payload.result?.addressMatches?.[0];
    const lat = Number(match?.coordinates?.y), lon = Number(match?.coordinates?.x);
    if (!match || !Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ ok: false, error: "No street-address match. Try a full street address, or click the map." }, { status: 404 });
    if (!insideState(state, { lat, lon })) return NextResponse.json({ ok: false, error: `That address is outside ${state}.` }, { status: 400 });
    return NextResponse.json({ ok: true, lat, lon, matched: match.matchedAddress ?? address });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error && error.name !== "AbortError" ? error.message : "Address lookup timed out" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
