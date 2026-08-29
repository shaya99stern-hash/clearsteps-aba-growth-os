import assert from "node:assert/strict";
import {
  buildScoutResearchPersistence,
  persistScoutResearch,
  type ScoutResearchPersistenceWriter,
} from "../lib/intelligence/research-persistence";

const completedAt = "2026-08-29T17:00:00.000Z";
const input = {
  query: "find referral partners for expansion",
  location: "Johnson County, KS",
  state: "KS" as const,
  engine: "client" as const,
  plan: { mode: "referral", queries: [{ lane: "referral", query: "Johnson County pediatric referrals" }] },
  sourceStatus: [
    { source: "Kansas KDHE Early Intervention", status: "complete" as const, detail: "1 current Kansas KDHE early-intervention program" },
  ],
  screened: 3,
  leads: [
    {
      id: "lead-johnson-tiny-k",
      name: "Johnson County Infant-Toddler Services",
      kind: "organization" as const,
      location: "Johnson County, KS",
      score: 82,
      confidence: 91,
      reasons: ["Official Kansas KDHE early-intervention program"],
      unknowns: [],
      emails: [],
      phones: [],
      evidence: [
        {
          id: "evidence-kdhe-ks16",
          sourceId: "ks-kdhe-tiny-k-reports",
          title: "Johnson County Infant-Toddler Services",
          url: "https://www.kdhe.ks.gov/DocumentCenter/View/51016/KS16-Johnson-County-Infant-Toddler-Services-PDF",
          snippet: "Official Kansas KDHE early-intervention program.",
          query: "KDHE tiny-k early intervention Johnson County, KS",
          capturedAt: completedAt,
          purpose: "discover" as const,
          geography: "Johnson County, KS",
        },
      ],
      signals: ["early-intervention"],
    },
  ],
  engineScores: {
    client: { engine: "client" as const, score: 74, confidence: 82, coverage: 55, observedIndicators: 11, applicableIndicators: 20, pillarBreakdown: [] },
    rbt: { engine: "rbt" as const, score: 25, confidence: 30, coverage: 10, observedIndicators: 2, applicableIndicators: 20, pillarBreakdown: [] },
    bcba: { engine: "bcba" as const, score: 20, confidence: 28, coverage: 10, observedIndicators: 2, applicableIndicators: 20, pillarBreakdown: [] },
  },
  territory: {
    location: "Johnson County, KS",
    total: 74,
    label: "High",
    confidence: 82,
    coverage: 55,
    reasoning: ["Referral ecosystem: 74/100 from official and federal evidence"],
  },
  errors: [],
  completedAt,
};

const payload = buildScoutResearchPersistence(input);
assert.equal(payload.researchRun.status, "complete");
assert.equal(payload.researchRun.query, input.query);
assert.equal(payload.researchRun.location, input.location);
assert.equal(payload.researchRun.screenedCount, 3);
assert.equal(payload.researchRun.qualifiedCount, 1);
assert.equal(payload.researchRun.completedAt.toISOString(), completedAt);
assert.deepEqual(JSON.parse(payload.researchRun.planJson).state, "KS");
assert.deepEqual(JSON.parse(payload.researchRun.planJson).engine, "client");
assert.equal(JSON.parse(payload.researchRun.sourceJson)[0].source, "Kansas KDHE Early Intervention");
assert.deepEqual(JSON.parse(payload.researchRun.errorsJson), []);

assert.equal(payload.evidence.length, 1, "public evidence should be deduplicated before durable writes");
assert.equal(payload.evidence[0].entityType, "organization");
assert.equal(payload.evidence[0].entityId, "lead-johnson-tiny-k");
assert.equal(payload.evidence[0].sourceId, "ks-kdhe-tiny-k-reports");
assert.equal(payload.evidence[0].confidence, 91);
assert.equal(payload.evidence[0].capturedAt.toISOString(), completedAt);

assert.equal(payload.scoreSnapshots.length, 2, "a completed Scout run should persist territory and lead score snapshots");
const territorySnapshot = payload.scoreSnapshots.find((snapshot) => snapshot.entityType === "territory");
assert(territorySnapshot);
assert.equal(territorySnapshot.entityId, "KS:johnson-county-ks:client");
assert.equal(territorySnapshot.score, 74);
assert.equal(territorySnapshot.confidence, 82);
assert.equal(JSON.parse(territorySnapshot.breakdownJson).engine, "client");
assert.deepEqual(JSON.parse(territorySnapshot.reasonsJson), input.territory.reasoning);

const leadSnapshot = payload.scoreSnapshots.find((snapshot) => snapshot.entityId === "lead-johnson-tiny-k");
assert(leadSnapshot);
assert.equal(leadSnapshot.entityType, "organization");
assert.equal(leadSnapshot.score, 82);
assert.equal(JSON.parse(leadSnapshot.breakdownJson).signals[0], "early-intervention");

const writer: ScoutResearchPersistenceWriter = {
  save: async (value) => {
    assert.equal(value.researchRun.qualifiedCount, 1, "writer should receive the normalized persistence payload");
    return { runId: "run-123" };
  },
};
const persisted = await persistScoutResearch(input, writer);
assert.deepEqual(persisted, {
  persisted: true,
  runId: "run-123",
  evidenceCount: 1,
  scoreSnapshotCount: 2,
});

const skipped = await persistScoutResearch(input, null);
assert.deepEqual(skipped, { persisted: false, reason: "database_unavailable" });

console.log("Scout research persistence verification passed.");
