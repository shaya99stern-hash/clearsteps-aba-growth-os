"use client";

import type { ResolvedLead } from "@/lib/intelligence/source-types";

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
    cachedLeads = Array.isArray(parsed) ? parsed.filter(isSavedCrmLead) : EMPTY_LEADS;
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
  const saved: SavedCrmLead = {
    ...lead,
    savedAt: new Date().toISOString(),
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
  const next = loadCrmLeads().map((lead) => lead.id === id ? { ...lead, stage } : lead);
  writeCrmLeads(next);
  void persistStage(id, stage);
  return next;
}

export function syncDurableCrmLeads() {
  if (typeof window === "undefined") return Promise.resolve();
  if (syncInFlight) return syncInFlight;
  syncInFlight = fetch("/api/crm/leads", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return;
      const json = await response.json() as { leads?: unknown };
      if (!Array.isArray(json.leads)) return;
      const durable = json.leads.filter(isSavedCrmLead);
      if (durable.length === 0) return;
      const merged = new Map(loadCrmLeads().map((lead) => [lead.id, lead]));
      for (const lead of durable) {
        const local = merged.get(lead.id);
        if (!local || Date.parse(lead.savedAt) >= Date.parse(local.savedAt)) merged.set(lead.id, lead);
      }
      writeCrmLeads(Array.from(merged.values()));
    })
    .catch(() => undefined)
    .finally(() => { syncInFlight = null; });
  return syncInFlight;
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

function isSavedCrmLead(value: unknown): value is SavedCrmLead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Partial<SavedCrmLead>;
  return typeof lead.id === "string"
    && typeof lead.name === "string"
    && ["organization", "referral", "professional", "candidate"].includes(String(lead.kind))
    && (lead.pipeline === "referral" || lead.pipeline === "talent")
    && typeof lead.stage === "string"
    && typeof lead.savedAt === "string"
    && Array.isArray(lead.evidence)
    && Array.isArray(lead.reasons)
    && Array.isArray(lead.unknowns)
    && Array.isArray(lead.emails)
    && Array.isArray(lead.phones)
    && Array.isArray(lead.signals);
}
