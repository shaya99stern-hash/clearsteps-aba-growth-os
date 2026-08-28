"use client";

import type { ResolvedLead } from "@/lib/intelligence/source-types";
import { reconcileTimestampedRecords } from "@/lib/sync/reconcile";

export type PipelineStage =
  | "Discovered"
  | "Researched"
  | "Qualified"
  | "Contact Ready"
  | "Outreach"
  | "Engaged"
  | "Referral Partner"
  | "Referral Received";

export type TalentStage =
  | "Discovered"
  | "Verified"
  | "Contacted"
  | "Replied"
  | "Screen"
  | "Interview"
  | "Credentialing"
  | "Hired";

export interface SavedCrmLead extends ResolvedLead {
  savedAt: string;
  updatedAt: string;
  pipeline: "referral" | "talent";
  stage: PipelineStage | TalentStage;
}

const STORAGE_KEY = "clearsteps.crm.leads.v1";
const CHANGE_EVENT = "clearsteps:crm-change";
const EMPTY_LEADS: SavedCrmLead[] = [];
let cachedRaw: string | undefined;
let cachedLeads: SavedCrmLead[] = EMPTY_LEADS;
let syncInFlight: Promise<void> | null = null;

export function loadCrmLeads(): SavedCrmLead[] {
  if (typeof window === "undefined") return EMPTY_LEADS;
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw === cachedRaw) return cachedLeads;
  try {
    const parsed = JSON.parse(raw);
    cachedLeads = Array.isArray(parsed)
      ? parsed.map(normalizeSavedCrmLead).filter((lead): lead is SavedCrmLead => Boolean(lead))
      : EMPTY_LEADS;
  } catch {
    cachedLeads = EMPTY_LEADS;
  }
  cachedRaw = raw;
  return cachedLeads;
}

export function getServerCrmLeads(): SavedCrmLead[] {
  return EMPTY_LEADS;
}

export function subscribeCrmLeads(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedRaw = undefined;
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function canSaveToCrm(lead: ResolvedLead) {
  return ["organization", "referral", "professional", "candidate"].includes(lead.kind);
}

export function saveCrmLead(lead: ResolvedLead): SavedCrmLead {
  if (!canSaveToCrm(lead)) {
    throw new Error("Area-level signals are intelligence only and cannot be saved as outreach contacts.");
  }
  const pipeline = lead.kind === "candidate" ? "talent" : "referral";
  const now = new Date().toISOString();
  const saved: SavedCrmLead = {
    ...lead,
    savedAt: now,
    updatedAt: now,
    pipeline,
    stage: "Discovered",
  };
  const current = loadCrmLeads();
  const next = [saved, ...current.filter((item) => item.id !== saved.id)];
  writeCrmLeads(next);
  void persistCrmLead(saved);
  return saved;
}

export function updateCrmStage(id: string, stage: PipelineStage | TalentStage) {
  const now = new Date().toISOString();
  const next = loadCrmLeads().map((lead) => lead.id === id ? { ...lead, stage, updatedAt: now } : lead);
  writeCrmLeads(next);
  void persistStage(id, stage);
  return next;
}

export function syncDurableCrmLeads() {
  if (typeof window === "undefined") return Promise.resolve();
  if (syncInFlight) return syncInFlight;
  syncInFlight = reconcileDurableCrmLeads().finally(() => { syncInFlight = null; });
  return syncInFlight;
}

async function reconcileDurableCrmLeads() {
  try {
    const response = await fetch("/api/crm/leads", { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json() as { leads?: unknown };
    if (!Array.isArray(json.leads)) return;
    const durable = json.leads
      .map(normalizeSavedCrmLead)
      .filter((lead): lead is SavedCrmLead => Boolean(lead));
    const result = reconcileTimestampedRecords(loadCrmLeads(), durable);
    writeCrmLeads(result.merged.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
    await Promise.allSettled(result.backfill.map((lead) => persistCrmLead(lead)));
  } catch {
    // Browser storage remains authoritative until the durable service returns.
  }
}

async function persistCrmLead(lead: SavedCrmLead) {
  try {
    await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      keepalive: true,
    });
  } catch {
    // Browser storage remains the authoritative fallback until the next sync.
  }
}

async function persistStage(id: string, stage: PipelineStage | TalentStage) {
  try {
    await fetch("/api/crm/leads", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, stage }),
      keepalive: true,
    });
  } catch {
    // Browser storage remains the authoritative fallback until the next sync.
  }
}

function writeCrmLeads(leads: SavedCrmLead[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(leads);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedLeads = leads;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function normalizeSavedCrmLead(value: unknown): SavedCrmLead | null {
  if (!value || typeof value !== "object") return null;
  const lead = value as Partial<SavedCrmLead>;
  if (typeof lead.id !== "string"
    || typeof lead.name !== "string"
    || !["organization", "referral", "professional", "candidate"].includes(String(lead.kind))
    || (lead.pipeline !== "referral" && lead.pipeline !== "talent")
    || typeof lead.stage !== "string"
    || typeof lead.savedAt !== "string"
    || (lead.updatedAt !== undefined && typeof lead.updatedAt !== "string")
    || !Array.isArray(lead.evidence)
    || !Array.isArray(lead.reasons)
    || !Array.isArray(lead.unknowns)
    || !Array.isArray(lead.emails)
    || !Array.isArray(lead.phones)
    || !Array.isArray(lead.signals)) return null;
  return { ...lead, updatedAt: lead.updatedAt ?? lead.savedAt } as SavedCrmLead;
}
