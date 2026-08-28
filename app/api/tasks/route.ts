import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured } from "@/lib/db/prisma";
import { listDurableTasks, taskInputSchema, updateDurableTaskStatus, upsertDurableTask } from "@/lib/tasks/server-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  if (!databaseConfigured()) return unavailable();
  try {
    return NextResponse.json({ ok: true, durable: true, tasks: await listDurableTasks() ?? [] });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return unavailable();
  const parsed = taskInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, durable: true, error: "Task failed validation.", issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, durable: true, task: await upsertDurableTask(parsed.data) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request) {
  if (!databaseConfigured()) return unavailable();
  const parsed = z.object({ id: z.string().min(1).max(300), status: z.enum(["open", "in_progress", "done"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, durable: true, error: "Invalid task update." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, durable: true, task: await updateDurableTaskStatus(parsed.data.id, parsed.data.status) });
  } catch (error) {
    return databaseError(error);
  }
}

function unavailable() {
  return NextResponse.json({ ok: false, durable: false, storage: "browser_only", error: "PostgreSQL is not configured; tasks remain in browser storage." }, { status: 503 });
}

function databaseError(error: unknown) {
  console.error("Clear Steps task persistence error", error instanceof Error ? error.message : "unknown database error");
  return NextResponse.json({ ok: false, durable: true, error: "Task persistence is temporarily unavailable." }, { status: 503 });
}
