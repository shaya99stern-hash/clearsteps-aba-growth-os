"use client";

/** Small, privacy-bounded research summaries. Never store patient or household dossiers. */
export type ScoutEngine = "client" | "rbt" | "bcba";
export type ScoutState = "MO" | "KS" | "CO";
export type EvidencePosture = "review" | "thin" | "stale";

export interface ScoutRun {
  id: string;
  capturedAt: string;
  state: ScoutState;
  engine: ScoutEngine;
  location: string;
  query: string;
  score: number;
  label: string;
  confidence: number;
  coverage: number;
  reasoning: string[];
  screened: number;
  qualified: number;
  observedIndicators: number;
  applicableIndicators: number;
  completedSources: number;
  sourceCount: number;
  warnings: number;
}

type CompletedScoutResponse = {
  ok: boolean;
  territory?: {
    location: string;
    total: number;
    label: string;
    confidence: number;
    coverage?: number;
    reasoning: string[];
  };
  sourceStatus?: Array<{ source: string; status: string }>;
  screened?: number;
  leads?: unknown[];
  indicatorSummary?: { selectedObserved: number; selectedApplicable: number };
  errors?: string[];
};

const KEY = "clearsteps.scout.history.v1";
const CHANGED = "clearsteps:scout-history-change";
const EMPTY: ScoutRun[] = [];
let cachedRaw: string | undefined;
let cachedRuns: ScoutRun[] = EMPTY;

export function getServerScoutRuns(): ScoutRun[] {
  return EMPTY;
}

export function loadScoutRuns(): ScoutRun[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string;
  try {
    raw = window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedRuns;
  try {
    const parsed: unknown = JSON.parse(raw);
    cachedRuns = Array.isArray(parsed)
      ? parsed.filter(isScoutRun).slice(0, 30).map((run) => {
          // Prior releases persisted unjustified 80/100 ratings at 3% model coverage.
          // Do not rewrite user history; just stop displaying those old scores as rankings.
          if (run.coverage < 12 || run.observedIndicators < 12) {
            return { ...run, score: 0, label: "Insufficient Evidence" };
          }
          return run;
        })
      : EMPTY;
  } catch {
    cachedRuns = EMPTY;
  }
  cachedRaw = raw;
  return cachedRuns;
}

export function subscribeScoutRuns(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cachedRaw = undefined;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function recordScoutRun(
  response: CompletedScoutResponse,
  context: { state: ScoutState; engine: ScoutEngine; query: string; location: string },
): boolean {
  if (!response.ok || !response.territory || typeof window === "undefined") return false;
  const sources = response.sourceStatus ?? [];
  const territory = response.territory;
  const snapshot: ScoutRun = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "run-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    capturedAt: new Date().toISOString(),
    state: context.state,
    engine: context.engine,
    location: (territory.location || context.location).slice(0, 160),
    query: context.query.slice(0, 1000),
    score: percent(territory.total),
    label: territory.label.slice(0, 80),
    confidence: percent(territory.confidence),
    coverage: percent(territory.coverage ?? 0),
    reasoning: territory.reasoning.slice(0, 6).map((reason) => reason.slice(0, 280)),
    screened: count(response.screened),
    qualified: count(response.leads?.length),
    observedIndicators: count(response.indicatorSummary?.selectedObserved),
    applicableIndicators: count(response.indicatorSummary?.selectedApplicable),
    completedSources: sources.filter((source) => source.status === "complete").length,
    sourceCount: sources.length,
    warnings: count(response.errors?.length),
  };
  const updated = [snapshot, ...loadScoutRuns()].slice(0, 30);
  try {
    const raw = JSON.stringify(updated);
    window.localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    cachedRuns = updated;
    window.dispatchEvent(new Event(CHANGED));
    return true;
  } catch {
    return false;
  }
}

export function latestTerritoryRuns(runs: readonly ScoutRun[]): ScoutRun[] {
  const latest = new Map<string, ScoutRun>();
  for (const run of runs) {
    const key = [run.state, run.engine, run.location.trim().toLowerCase()].join("|");
    const previous = latest.get(key);
    if (!previous || Date.parse(run.capturedAt) > Date.parse(previous.capturedAt)) latest.set(key, run);
  }
  return [...latest.values()].sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
}

/** Evidence review is not a license, payer, outreach or eligibility approval. */
export function evidencePosture(run: ScoutRun, now: number): EvidencePosture {
  const age = now - Date.parse(run.capturedAt);
  if (!Number.isFinite(age) || age > 30 * 24 * 60 * 60 * 1000) return "stale";
  if (run.coverage < 20 || run.confidence < 55 || run.completedSources < 2) return "thin";
  return "review";
}

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
function percent(value: unknown) {
  return Math.min(100, count(value));
}
function isScoutRun(value: unknown): value is ScoutRun {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<ScoutRun>;
  return typeof run.id === "string"
    && typeof run.capturedAt === "string"
    && ["MO", "KS", "CO"].includes(String(run.state))
    && ["client", "rbt", "bcba"].includes(String(run.engine))
    && typeof run.location === "string"
    && typeof run.query === "string"
    && [run.score, run.confidence, run.coverage, run.screened, run.qualified,
      run.observedIndicators, run.applicableIndicators, run.completedSources, run.sourceCount,
      run.warnings].every((n) => typeof n === "number" && Number.isFinite(n))
    && typeof run.label === "string"
    && Array.isArray(run.reasoning);
}
