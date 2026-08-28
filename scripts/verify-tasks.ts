import assert from "node:assert/strict";
import { nextTaskStatus, taskInputSchema } from "../lib/tasks/model";

const valid = taskInputSchema.safeParse({
  id: "task-1",
  title: "Call referral partner",
  description: "Confirm intake handoff process.",
  status: "open",
  priority: "high",
  dueAt: "2026-08-29T14:00:00.000Z",
  entityType: "referral",
  entityId: "lead-1",
});
assert.equal(valid.success, true, "valid operational task should parse");

const invalidStatus = taskInputSchema.safeParse({
  id: "task-2",
  title: "Bad status",
  status: "blocked",
  priority: "normal",
});
assert.equal(invalidStatus.success, false, "unsupported task status must be rejected");

assert.equal(nextTaskStatus("open"), "in_progress");
assert.equal(nextTaskStatus("in_progress"), "done");
assert.equal(nextTaskStatus("done"), "done");

console.log("Clear Steps task-domain acceptance passed.");
