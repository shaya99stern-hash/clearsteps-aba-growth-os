import assert from "node:assert/strict";
import { reconcileTimestampedRecords } from "../lib/sync/reconcile";

type RecordShape = { id: string; updatedAt: string; value: string };

const local: RecordShape[] = [
  { id: "local-only", updatedAt: "2026-08-28T10:00:00.000Z", value: "local" },
  { id: "local-newer", updatedAt: "2026-08-28T11:00:00.000Z", value: "local-new" },
  { id: "server-newer", updatedAt: "2026-08-28T09:00:00.000Z", value: "local-old" },
];
const durable: RecordShape[] = [
  { id: "local-newer", updatedAt: "2026-08-28T10:30:00.000Z", value: "server-old" },
  { id: "server-newer", updatedAt: "2026-08-28T12:00:00.000Z", value: "server-new" },
  { id: "server-only", updatedAt: "2026-08-28T10:15:00.000Z", value: "server" },
];

const result = reconcileTimestampedRecords(local, durable);
assert.deepEqual(
  result.backfill.map((record) => record.id).sort(),
  ["local-newer", "local-only"],
  "local-only and locally-newer records must be queued for durable backfill",
);
assert.deepEqual(
  Object.fromEntries(result.merged.map((record) => [record.id, record.value])),
  {
    "local-only": "local",
    "local-newer": "local-new",
    "server-newer": "server-new",
    "server-only": "server",
  },
  "newest copy must win while preserving records unique to either side",
);

const invalidTime = reconcileTimestampedRecords(
  [{ id: "same", updatedAt: "bad-date", value: "local" }],
  [{ id: "same", updatedAt: "2026-08-28T10:00:00.000Z", value: "server" }],
);
assert.equal(invalidTime.merged[0]?.value, "server", "an invalid local timestamp must not overwrite a valid durable record");
assert.equal(invalidTime.backfill.length, 0);

console.log("Clear Steps local-first reconciliation acceptance passed.");
