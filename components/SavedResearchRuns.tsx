"use client";

import { useSyncExternalStore } from "react";
import { getServerStorageArray, readStorageArray, SAVED_RUNS_KEY, subscribeStorageKey, writeStorageArray, type StoredRun } from "@/lib/clientStorage";

function subscribeRuns(onStoreChange: () => void) {
  return subscribeStorageKey(SAVED_RUNS_KEY, onStoreChange);
}

function getRuns() {
  return readStorageArray<StoredRun>(SAVED_RUNS_KEY);
}

function getServerRuns() {
  return getServerStorageArray<StoredRun>();
}

export function SavedResearchRuns() {
  const runs = useSyncExternalStore(subscribeRuns, getRuns, getServerRuns);

  function clearRuns() {
    writeStorageArray(SAVED_RUNS_KEY, []);
  }

  if (runs.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">No saved research runs yet</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Discovery scans will appear here after you run Lead Discovery. This page reads saved runs from this app/browser storage.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">Saved research runs</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{runs.length} saved runs</h2>
        </div>
        <button type="button" onClick={clearRuns} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          Clear saved runs
        </button>
      </div>
      <div className="grid gap-3">
        {runs.map((run) => (
          <article key={run.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950">{run.leadType} · {run.territory}</h3>
                <p className="mt-1 text-sm text-slate-500">{new Date(run.createdAt).toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-950">{run.resultsFound}</p><p className="text-xs text-slate-500">found</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-950">{run.saved}</p><p className="text-xs text-slate-500">saved</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-950">{run.errors.length}</p><p className="text-xs text-slate-500">warnings</p></div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {run.queries.slice(0, 10).map((query) => <span key={query} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{query}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
