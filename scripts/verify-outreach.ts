import assert from "node:assert/strict";
import { prepareReferralRecipient, renderOutreachTemplate } from "../lib/outreach/model";

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

console.log("Clear Steps outreach eligibility acceptance passed.");
