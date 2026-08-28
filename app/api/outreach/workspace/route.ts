import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured } from "@/lib/db/prisma";
import {
  OutreachEligibilityError,
  listDurableOutreachWorkspace,
  outreachDraftInputSchema,
  outreachSuppressionInputSchema,
  upsertDurableOutreachDraft,
  upsertDurableOutreachSuppression,
} from "@/lib/outreach/server-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save_draft"), draft: outreachDraftInputSchema }),
  z.object({ action: z.literal("suppress"), suppression: outreachSuppressionInputSchema }),
]);

export async function GET() {
  if (!databaseConfigured()) return unavailable();
  try {
    return NextResponse.json({
      ok: true,
      durable: true,
      workspace: await listDurableOutreachWorkspace() ?? { drafts: [], suppressions: [] },
    });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return unavailable();
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      ok: false,
      durable: true,
      error: "Outreach workspace update failed validation.",
      issues: parsed.error.issues,
    }, { status: 400 });
  }

  try {
    if (parsed.data.action === "save_draft") {
      return NextResponse.json({
        ok: true,
        durable: true,
        draft: await upsertDurableOutreachDraft(parsed.data.draft),
      });
    }
    return NextResponse.json({
      ok: true,
      durable: true,
      suppression: await upsertDurableOutreachSuppression(parsed.data.suppression),
    });
  } catch (error) {
    if (error instanceof OutreachEligibilityError) {
      return NextResponse.json({ ok: false, durable: true, error: error.message }, { status: 400 });
    }
    return databaseError(error);
  }
}

function unavailable() {
  return NextResponse.json({
    ok: false,
    durable: false,
    storage: "browser_only",
    error: "PostgreSQL is not configured; outreach drafts remain in browser storage.",
  }, { status: 503 });
}

function databaseError(error: unknown) {
  console.error("Clear Steps outreach persistence error", error instanceof Error ? error.message : "unknown database error");
  return NextResponse.json({ ok: false, durable: true, error: "Outreach persistence is temporarily unavailable." }, { status: 503 });
}
