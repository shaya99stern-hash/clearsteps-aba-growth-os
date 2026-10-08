import type { ResolvedLead } from "@/lib/intelligence/source-types";
import type { SavedCrmLead } from "./local-store";

/** Re-discovery refreshes evidence without moving a lead backwards in its workflow. */
export function prepareCrmLeadSave(
  lead: ResolvedLead,
  existing: SavedCrmLead | undefined,
  now: string,
): SavedCrmLead {
  if (!["organization", "referral", "professional", "candidate"].includes(lead.kind)) {
    throw new Error("Only eligible organizations and appropriately sourced individuals can enter CRM.");
  }
  // Domain/title based source IDs can collide across different entity classifications.
  // Never silently move a saved lead between talent and referral pipelines.
  if (existing && existing.kind !== lead.kind) return existing;

  return {
    ...lead,
    pipeline: existing?.pipeline ?? (lead.kind === "candidate" ? "talent" : "referral"),
    stage: existing?.stage ?? "Discovered",
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
  };
}
