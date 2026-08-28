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

const CHANGE_EVENT = "clearsteps:storage-change";
const EMPTY_ARRAY: never[] = [];
const cache = new Map<string, { raw: string; value: unknown[] }>();

export function readStorageArray<T>(key: string): T[] {
  if (typeof window === "undefined") return EMPTY_ARRAY as T[];
  const raw = window.localStorage.getItem(key) ?? "[]";
  const cached = cache.get(key);
  if (cached?.raw === raw) return cached.value as T[];
  try {
    const parsed = JSON.parse(raw);
    const value = Array.isArray(parsed) ? parsed as T[] : EMPTY_ARRAY as T[];
    cache.set(key, { raw, value });
    return value;
  } catch {
    cache.set(key, { raw, value: EMPTY_ARRAY });
    return EMPTY_ARRAY as T[];
  }
}

export function getServerStorageArray<T>(): T[] {
  return EMPTY_ARRAY as T[];
}

export function subscribeStorageKey(key: string, onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) {
      cache.delete(key);
      onStoreChange();
    }
  };
  const onCustom = (event: Event) => {
    if (event instanceof CustomEvent && event.detail === key) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onCustom);
  };
}

export function writeStorageArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  window.localStorage.setItem(key, raw);
  cache.set(key, { raw, value });
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

export function upsertById<T extends { id: string }>(key: string, rows: T[]) {
  const existing = readStorageArray<T>(key);
  const merged = new Map(existing.map((row) => [row.id, row]));
  for (const row of rows) merged.set(row.id, row);
  const output = Array.from(merged.values());
  writeStorageArray(key, output);
  return output;
}
