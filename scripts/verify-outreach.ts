import assert from "node:assert/strict";
import {
  outreachDraftInputSchema,
  outreachSuppressionInputSchema,
  prepareReferralRecipient,
  renderOutreachTemplate,
} from "../lib/outreach/model";

const baseLead = {
  id: "lead-1",
  name: "Bright Start Preschool",
  kind: "organization" as const,
  pipeline: "referral" as const,
  stage: "Qualified" as const,
  emails: ["DIRECTOR@BRIGHTSTART.EXAMPLE"],
  location: "Lakewood, NJ",
};

const eligible = prepareReferralRecipient(baseLead, new Set<string>());
assert.deepEqual(eligible, {
  entityId: "lead-1",
  name: "Bright Start Preschool",
  email: "director@brightstart.example",
  location: "Lakewood, NJ",
});

assert.equal(
  prepareReferralRecipient({ ...baseLead, pipeline: "talent", kind: "candidate", stage: "Verified" }, new Set<string>()),
  null,
  "talent candidates must never enter referral campaigns",
);
assert.equal(
  prepareReferralRecipient({ ...baseLead, emails: [] }, new Set<string>()),
  null,
  "records without a public email are not campaign-ready",
);
assert.equal(
  prepareReferralRecipient(baseLead, new Set(["director@brightstart.example"])),
  null,
  "suppressed addresses must be excluded",
);
assert.equal(
  prepareReferralRecipient({ ...baseLead, stage: "Discovered" }, new Set<string>()),
  null,
  "unqualified discovered records must not enter referral campaigns",
);

const rendered = renderOutreachTemplate(
  "Hello {{organization}}, we support families in {{location}}.",
  eligible!,
);
assert.equal(rendered, "Hello Bright Start Preschool, we support families in Lakewood, NJ.");

const reviewedDraft = outreachDraftInputSchema.parse({
  id: "campaign-1",
  name: "Lakewood referral partners",
  subject: "Referral coordination",
  body: "Hello {{organization}}",
  recipientIds: ["lead-1", "lead-1"],
  reviewed: true,
  createdAt: "2026-08-28T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
});
assert.deepEqual(reviewedDraft.recipientIds, ["lead-1"], "recipient IDs must be deduplicated before persistence");
assert.equal(
  outreachDraftInputSchema.safeParse({ ...reviewedDraft, reviewed: false }).success,
  false,
  "durable outreach must only accept manually reviewed drafts",
);
assert.equal(
  outreachDraftInputSchema.safeParse({ ...reviewedDraft, recipientIds: [] }).success,
  false,
  "durable outreach must reject empty recipient sets",
);

assert.equal(outreachSuppressionInputSchema.parse({ email: "  Director@BrightStart.Example  " }).email, "director@brightstart.example");
assert.equal(outreachSuppressionInputSchema.safeParse({ email: "not-an-email" }).success, false);

console.log("Clear Steps outreach eligibility and persistence acceptance passed.");
