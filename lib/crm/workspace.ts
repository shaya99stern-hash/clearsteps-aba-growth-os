import type { PipelineStage, SavedCrmLead, TalentStage } from "./local-store";

const REFERRAL_STAGES: PipelineStage[] = [
  "Discovered",
  "Researched",
  "Qualified",
  "Contact Ready",
  "Outreach",
  "Engaged",
  "Referral Partner",
  "Referral Received",
];

const TALENT_STAGES: TalentStage[] = [
  "Discovered",
  "Verified",
  "Contacted",
  "Replied",
  "Screen",
  "Interview",
  "Credentialing",
  "Hired",
];

export interface CrmWorkspaceSummary {
  total: number;
  ready: number;
  active: number;
  won: number;
}

export function filterCrmWorkspace(
  leads: SavedCrmLead[],
  mode: "referral" | "talent",
  query: string,
): SavedCrmLead[] {
  const normalizedQuery = normalize(query);
  return leads.filter((lead) => {
    if (lead.pipeline !== mode) return false;
    if (!normalizedQuery) return true;
    return normalize([
      lead.name,
      lead.stage,
      lead.kind,
      lead.location,
      lead.domain,
      lead.website,
      ...lead.emails,
      ...lead.phones,
      ...lead.signals,
    ].filter(Boolean).join(" ")).includes(normalizedQuery);
  });
}

export function summarizeCrmWorkspace(
  leads: SavedCrmLead[],
  mode: "referral" | "talent",
): CrmWorkspaceSummary {
  const modeLeads = leads.filter((lead) => lead.pipeline === mode);
  const stages = mode === "referral" ? REFERRAL_STAGES : TALENT_STAGES;
  const readyStage = mode === "referral" ? "Qualified" : "Verified";
  const activeStage = mode === "referral" ? "Engaged" : "Interview";
  const wonStage = mode === "referral" ? "Referral Received" : "Hired";
  const readyIndex = stages.indexOf(readyStage as never);
  const activeIndex = stages.indexOf(activeStage as never);

  return {
    total: modeLeads.length,
    ready: modeLeads.filter((lead) => stages.indexOf(lead.stage as never) >= readyIndex).length,
    active: modeLeads.filter((lead) => stages.indexOf(lead.stage as never) >= activeIndex).length,
    won: modeLeads.filter((lead) => lead.stage === wonStage).length,
  };
}

export function crmStageProgress(
  lead: SavedCrmLead,
): { index: number; total: number; percent: number } {
  const stages = lead.pipeline === "referral" ? REFERRAL_STAGES : TALENT_STAGES;
  const index = Math.max(0, stages.indexOf(lead.stage as never));
  return {
    index,
    total: stages.length,
    percent: stages.length <= 1 ? 100 : Math.round((index / (stages.length - 1)) * 100),
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
