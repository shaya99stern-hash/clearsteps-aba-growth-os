export type TimestampedRecord = {
  id: string;
  updatedAt: string;
};

export interface ReconciliationResult<T> {
  merged: T[];
  backfill: T[];
}

export function reconcileTimestampedRecords<T extends TimestampedRecord>(
  local: T[],
  durable: T[],
): ReconciliationResult<T> {
  const durableById = new Map(durable.map((record) => [record.id, record]));
  const merged: T[] = [];
  const seen = new Set<string>();
  const backfill: T[] = [];

  for (const localRecord of local) {
    const durableRecord = durableById.get(localRecord.id);
    if (!durableRecord) {
      merged.push(localRecord);
      backfill.push(localRecord);
      seen.add(localRecord.id);
      continue;
    }

    const localTime = parseTimestamp(localRecord.updatedAt);
    const durableTime = parseTimestamp(durableRecord.updatedAt);
    if (localTime > durableTime) {
      merged.push(localRecord);
      backfill.push(localRecord);
    } else {
      merged.push(durableRecord);
    }
    seen.add(localRecord.id);
  }

  for (const durableRecord of durable) {
    if (!seen.has(durableRecord.id)) merged.push(durableRecord);
  }

  return { merged, backfill };
}

function parseTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
