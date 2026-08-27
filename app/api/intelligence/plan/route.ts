import { NextResponse } from "next/server";
import { buildSearchPlan } from "@/lib/intelligence/query-planner";
import { getSourceRegistry } from "@/lib/intelligence/source-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { query?: string; location?: string };
  const query = body.query?.trim();
  const location = body.location?.trim() ?? "";
  if (!query || query.length < 3) {
    return NextResponse.json({ ok: false, error: "Enter a research request." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    plan: buildSearchPlan(query, location),
    sources: getSourceRegistry(),
  });
}
