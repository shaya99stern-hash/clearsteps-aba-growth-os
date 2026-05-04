export const SAVED_LEADS_KEY = "clearsteps.savedLeads.v1";
export const SAVED_RUNS_KEY = "clearsteps.savedRuns.v1";

export type StoredRun = {
  id: string;
  createdAt: string;
  territory: string;
  leadType: string;
  queries: string[];
  resultsFound: number;
  saved: number;
  excluded: number;
  errors: string[];
};

export function readStorageArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export function writeStorageArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function upsertById<T extends { id: string }>(key: string, rows: T[]) {
  const existing = readStorageArray<T>(key);
  const merged = new Map(existing.map((row) => [row.id, row]));
  for (const row of rows) merged.set(row.id, row);
  const output = Array.from(merged.values());
  writeStorageArray(key, output);
  return output;
}
