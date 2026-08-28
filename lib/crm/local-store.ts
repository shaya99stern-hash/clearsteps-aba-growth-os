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

export function loadCrmLeads(): SavedCrmLead[] {
  if (typeof window === "undefined") return EMPTY_LEADS;
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw === cachedRaw) return cachedLeads;
  try {
    const parsed = JSON.parse(raw);
    cachedLeads = Array.isArray(parsed) ? parsed : EMPTY_LEADS;
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
  return saved;
}

export function updateCrmStage(id: string, stage: PipelineStage | TalentStage) {
  const next = loadCrmLeads().map((lead) => lead.id === id ? { ...lead, stage } : lead);
  writeCrmLeads(next);
  return next;
}

function writeCrmLeads(leads: SavedCrmLead[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(leads);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedLeads = leads;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
