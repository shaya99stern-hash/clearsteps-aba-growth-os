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

export function loadCrmLeads(): SavedCrmLead[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCrmLead(lead: ResolvedLead): SavedCrmLead {
  const pipeline = lead.kind === "candidate" ? "talent" : "referral";
  const saved: SavedCrmLead = {
    ...lead,
    savedAt: new Date().toISOString(),
    pipeline,
    stage: "Discovered",
  };
  const current = loadCrmLeads();
  const next = [saved, ...current.filter((item) => item.id !== saved.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return saved;
}

export function updateCrmStage(id: string, stage: PipelineStage | TalentStage) {
  const next = loadCrmLeads().map((lead) => lead.id === id ? { ...lead, stage } : lead);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
