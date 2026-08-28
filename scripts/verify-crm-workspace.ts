import assert from "node:assert/strict";
import { filterCrmWorkspace, summarizeCrmWorkspace } from "../lib/crm/workspace";
import type { SavedCrmLead } from "../lib/crm/local-store";

function lead(input: Partial<SavedCrmLead> & Pick<SavedCrmLead, "id" | "name" | "pipeline" | "stage">): SavedCrmLead {
  return {
    id: input.id,
    name: input.name,
    pipeline: input.pipeline,
    stage: input.stage,
    kind: input.kind ?? (input.pipeline === "talent" ? "candidate" : "organization"),
    score: input.score ?? 70,
    confidence: input.confidence ?? 80,
    reasons: input.reasons ?? [],
    unknowns: input.unknowns ?? [],
    emails: input.emails ?? [],
    phones: input.phones ?? [],
    evidence: input.evidence ?? [],
    signals: input.signals ?? [],
    savedAt: input.savedAt ?? "2026-08-28T12:00:00.000Z",
    updatedAt: input.updatedAt ?? "2026-08-28T12:00:00.000Z",
    location: input.location,
    domain: input.domain,
    website: input.website,
  };
}

const leads: SavedCrmLead[] = [
  lead({ id: "ref-1", name: "Lakeview Pediatrics", pipeline: "referral", stage: "Qualified", location: "Lakewood, NJ", emails: ["referrals@lakeview.test"] }),
  lead({ id: "ref-2", name: "Bright Start Preschool", pipeline: "referral", stage: "Engaged", location: "Toms River, NJ" }),
  lead({ id: "ref-3", name: "Family Speech Center", pipeline: "referral", stage: "Referral Received", domain: "familyspeech.test" }),
  lead({ id: "tal-1", name: "Jordan Candidate", pipeline: "talent", stage: "Interview", location: "Brick, NJ" }),
];

assert.deepEqual(
  filterCrmWorkspace(leads, "referral", "pediatrics").map((item) => item.id),
  ["ref-1"],
  "CRM search should match referral records by normalized text fields",
);

assert.deepEqual(
  filterCrmWorkspace(leads, "referral", "family speech").map((item) => item.id),
  ["ref-3"],
  "CRM search should match across names and domains",
);

assert.deepEqual(
  summarizeCrmWorkspace(leads, "referral"),
  { total: 3, ready: 3, active: 2, won: 1 },
  "Referral KPIs should count qualified-or-later, engaged-or-later, and received referrals",
);

assert.deepEqual(
  summarizeCrmWorkspace(leads, "talent"),
  { total: 1, ready: 1, active: 1, won: 0 },
  "Talent KPIs should count verified-or-later, interview-or-later, and hires",
);

console.log("CRM workspace rules verified");
