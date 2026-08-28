import { NextResponse } from "next/server";
import { getOperationalSourcesSnapshot } from "@/lib/intelligence/source-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  const snapshot = await getOperationalSourcesSnapshot();
  return NextResponse.json({ ok: true, ...snapshot });
}
