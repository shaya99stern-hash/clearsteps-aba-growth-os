import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured } from "@/lib/db/prisma";
import { durableCrmLeadSchema, listDurableCrmLeads, updateDurableCrmStage, upsertDurableCrmLead } from "@/lib/crm/server-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  if (!databaseConfigured()) return unavailable();
  try {
    const leads = await listDurableCrmLeads();
    return NextResponse.json({ ok: true, durable: true, leads: leads ?? [] });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return unavailable();
  const parsed = durableCrmLeadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, durable: true, error: "CRM record failed validation.", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const lead = await upsertDurableCrmLead(parsed.data);
    return NextResponse.json({ ok: true, durable: true, lead });
  } catch (error) {
    if (error instanceof Error && /pipeline/i.test(error.message)) {
      return NextResponse.json({ ok: false, durable: true, error: error.message }, { status: 400 });
    }
    return databaseError(error);
  }
}

export async function PATCH(request: Request) {
  if (!databaseConfigured()) return unavailable();
  const parsed = z.object({
    id: z.string().min(1).max(300),
    stage: z.string().trim().min(1).max(80),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, durable: true, error: "Invalid CRM stage update." }, { status: 400 });
  try {
    const lead = await updateDurableCrmStage(parsed.data.id, parsed.data.stage);
    return NextResponse.json({ ok: true, durable: true, lead });
  } catch (error) {
    return databaseError(error);
  }
}

function unavailable() {
  return NextResponse.json({
    ok: false,
    durable: false,
    storage: "browser_only",
    error: "PostgreSQL is not configured. Clear Steps is preserving CRM data in browser storage until DATABASE_URL is connected.",
  }, { status: 503 });
}

function databaseError(error: unknown) {
  console.error("Clear Steps CRM persistence error", error instanceof Error ? error.message : "unknown database error");
  return NextResponse.json({ ok: false, durable: true, error: "CRM persistence is temporarily unavailable." }, { status: 503 });
}
