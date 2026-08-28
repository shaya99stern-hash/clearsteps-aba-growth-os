import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSearchPlan } from "@/lib/intelligence/query-planner";
import { getSourceRegistry } from "@/lib/intelligence/source-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = z.object({
    query: z.string().trim().min(3).max(1_000),
    location: z.string().trim().max(160).optional().default(""),
  }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid research request." }, { status: 400 });
  }
  const { query, location } = parsed.data;

  return NextResponse.json({
    ok: true,
    plan: buildSearchPlan(query, location),
    sources: getSourceRegistry(),
  });
}
