import assert from "node:assert/strict";
import {
  INDICATOR_CATALOG,
  INDICATOR_PILLARS,
  indicatorsForEngine,
  scoreEngineFromObservations,
} from "../lib/intelligence/phase3/indicator-catalog";
import { evaluateRegulatoryContext, REGULATORY_RULES } from "../lib/intelligence/phase3/regulatory-rules";
import { parseNppesResponse } from "../lib/intelligence/official/nppes-live";

assert.equal(INDICATOR_PILLARS.length, 12, "Phase 3 should have 12 MECE indicator pillars");
assert.equal(INDICATOR_CATALOG.length, 120, "Phase 3 should expose exactly 120 initial indicators");
assert.equal(new Set(INDICATOR_CATALOG.map((indicator) => indicator.id)).size, 120, "Indicator IDs must be unique");
assert(indicatorsForEngine("client").length > indicatorsForEngine("rbt").length, "Client engine should use the broader territory/referral evidence set");
assert(indicatorsForEngine("rbt").some((indicator) => indicator.pillarId === "rbt-workforce"));
assert(indicatorsForEngine("bcba").some((indicator) => indicator.pillarId === "bcba-workforce"));

const emptyClient = scoreEngineFromObservations("client", []);
assert.equal(emptyClient.score, 0, "Missing data must not create opportunity score");
assert.equal(emptyClient.coverage, 0);
assert.equal(emptyClient.confidence, 0);

const clientWithEvidence = scoreEngineFromObservations("client", [
  { indicatorId: "demographic-demand.01", value: 80, confidence: 90, sourceIds: ["census"] },
  { indicatorId: "referral-ecosystem.01", value: 70, confidence: 85, sourceIds: ["nppes"] },
  { indicatorId: "aba-supply.01", value: 20, confidence: 80, sourceIds: ["nppes"] },
]);
assert(clientWithEvidence.score > 70, "Low ABA supply should reverse into opportunity while strong demand/referrals contribute positively");
assert(clientWithEvidence.coverage > 0 && clientWithEvidence.coverage < 100);

assert(REGULATORY_RULES.some((rule) => rule.id === "mo-healthnet-rbt-90-day"));
assert(REGULATORY_RULES.some((rule) => rule.id === "ks-lba-practice-65-7503"));

const moDay45 = evaluateRegulatoryContext({
  state: "MO",
  role: "rbt",
  payer: "mo-healthnet",
  nationalCredentialVerified: false,
  rbtCompetencyAssessmentDate: "2026-07-15",
  asOf: "2026-08-29",
});
assert.equal(moDay45.find((decision) => decision.ruleId === "mo-healthnet-rbt-90-day")?.status, "REVIEW");

const moDay91 = evaluateRegulatoryContext({
  state: "MO",
  role: "rbt",
  payer: "mo-healthnet",
  nationalCredentialVerified: false,
  rbtCompetencyAssessmentDate: "2026-05-28",
  asOf: "2026-08-28",
});
assert.equal(moDay91.find((decision) => decision.ruleId === "mo-healthnet-rbt-90-day")?.status, "BLOCK");

const moCredentialed = evaluateRegulatoryContext({ state: "MO", role: "rbt", payer: "mo-healthnet", nationalCredentialVerified: true });
assert.equal(moCredentialed.find((decision) => decision.ruleId === "mo-healthnet-rbt-90-day")?.status, "PASS");

const ksUnknownLicense = evaluateRegulatoryContext({ state: "KS", role: "bcba", payer: "commercial" });
assert.equal(ksUnknownLicense.find((decision) => decision.ruleId === "ks-lba-practice-65-7503")?.status, "REVIEW");
const ksMissingLicense = evaluateRegulatoryContext({ state: "KS", role: "bcba", payer: "commercial", stateLicenseVerified: false });
assert.equal(ksMissingLicense.find((decision) => decision.ruleId === "ks-lba-practice-65-7503")?.status, "BLOCK");
const ksVerifiedLicense = evaluateRegulatoryContext({ state: "KS", role: "bcba", payer: "commercial", stateLicenseVerified: true });
assert.equal(ksVerifiedLicense.find((decision) => decision.ruleId === "ks-lba-practice-65-7503")?.status, "PASS");

const nppes = parseNppesResponse({
  result_count: 1,
  results: [{
    number: "1234567890",
    enumeration_type: "NPI-2",
    basic: { organization_name: "Example ABA", status: "A" },
    addresses: [{ address_purpose: "LOCATION", city: "Springfield", state: "MO", postal_code: "65807", telephone_number: "417-555-0100" }],
    taxonomies: [{ code: "103K00000X", desc: "Behavior Analyst", primary: true }],
  }],
});
assert.equal(nppes.results.length, 1);
assert.equal(nppes.errors.length, 0);

console.log("Phase 3 ABA Engine verification passed.");
