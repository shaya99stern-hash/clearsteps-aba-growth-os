import assert from "node:assert/strict";
import { evidencePosture, latestTerritoryRuns, type ScoutRun } from "../lib/intelligence/scout-history";
import { buildOperatorQueue, operatorSummary } from "../lib/intelligence/operator-insights";
import type { SavedCrmLead } from "../lib/crm/local-store";
import type { SavedTask } from "../lib/tasks/local-store";
import { prepareCrmLeadSave } from "../lib/crm/promotion";

const now = Date.parse("2026-10-08T10:00:00.000Z");
const base: ScoutRun = {
  id: "one", capturedAt: "2026-10-08T09:00:00.000Z", state: "MO", engine: "client",
  location: "St Louis, Missouri", query: "Public referrals", score: 80, label: "High",
  confidence: 78, coverage: 44, reasoning: ["Public evidence"], screened: 20, qualified: 4,
  observedIndicators: 20, applicableIndicators: 60, completedSources: 3, sourceCount: 4, warnings: 0,
};
const old: ScoutRun = { ...base, id: "old", capturedAt: "2026-09-01T10:00:00.000Z", score: 90 };
const ks: ScoutRun = { ...base, id: "ks", state: "KS", engine: "rbt", location: "Wichita, Kansas", coverage: 8 };
assert.equal(latestTerritoryRuns([old, base, ks]).length, 2);
assert.equal(latestTerritoryRuns([old, base, ks])[0].id, "one");
assert.equal(evidencePosture(base, now), "review");
assert.equal(evidencePosture(ks, now), "thin");
assert.equal(evidencePosture(old, now), "stale");

const lead = {
  id: "ref-1", name: "Public Referral Organization", pipeline: "referral", stage: "Discovered",
  score: 81, confidence: 75, kind: "referral", 
} as SavedCrmLead;
const task = {
  id: "task-1", title: "Check source", status: "open", priority: "high",
  dueAt: "2026-10-07T12:00:00Z",
} as SavedTask;
const queue = buildOperatorQueue([base], [lead], [task], now);
assert(queue.some((item) => item.kind === "overdue"));
assert(queue.some((item) => item.kind === "crm"));
assert(queue.some((item) => item.kind === "territory"));
assert(!buildOperatorQueue([], [], [], now).length);
assert.equal(operatorSummary([old, base, ks], [lead], [task], now).savedTerritories, 2);
assert(!buildOperatorQueue([], [lead], [{ ...task, entityId: "ref-1" }], now).some((item) => item.kind === "crm"));
const previouslyQualified = { ...lead, stage: "Qualified", savedAt: "2026-09-01T00:00:00.000Z" } as SavedCrmLead;
const resaved = prepareCrmLeadSave(lead, previouslyQualified, "2026-10-08T00:00:00.000Z");
assert.equal(resaved.stage, "Qualified", "Re-discovery must not reset CRM stage");
assert.equal(resaved.savedAt, previouslyQualified.savedAt, "Re-discovery must preserve original save date");
assert.equal(resaved.updatedAt, "2026-10-08T00:00:00.000Z");
console.log("Command center and CRM re-discovery regression tests passed.");
