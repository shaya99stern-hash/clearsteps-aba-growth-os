"use client";

import { FormEvent, useState } from "react";

const leadTypes = [
  "daycare",
  "preschool",
  "child psychologist",
  "neuropsych testing center",
  "autism evaluator",
  "speech therapy clinic",
  "occupational therapy clinic",
  "pediatrician",
  "developmental pediatrician",
  "autism community organization",
  "competitor ABA provider",
];

type DiscoveryResult = {
  ok: boolean;
  serpapiConfigured: boolean;
  status?: string;
  message?: string;
  error?: string;
  request?: Record<string, unknown>;
};

export function LeadDiscoveryForm() {
  const [state, setState] = useState("NJ");
  const [cityOrZip, setCityOrZip] = useState("");
  const [leadType, setLeadType] = useState("daycare");
  const [maxResults, setMaxResults] = useState(10);
  const [excludeCompetitors, setExcludeCompetitors] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, cityOrZip, leadType, maxResults, excludeCompetitors }),
      });
      const data = (await response.json()) as DiscoveryResult;
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        serpapiConfigured: false,
        error: error instanceof Error ? error.message : "Discovery request failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">State</span>
          <select value={state} onChange={(event) => setState(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600">
            <option value="NJ">NJ</option>
            <option value="MO">MO</option>
          </select>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">City or ZIP</span>
          <input value={cityOrZip} onChange={(event) => setCityOrZip(event.target.value)} placeholder="Example: Lakewood or 08701" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Lead type</span>
          <select value={leadType} onChange={(event) => setLeadType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600">
            {leadTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Max results</span>
          <input type="number" min="1" max="25" value={maxResults} onChange={(event) => setMaxResults(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <input type="checkbox" checked={excludeCompetitors} onChange={(event) => setExcludeCompetitors(event.target.checked)} className="h-4 w-4" />
          Exclude competitors from referral leads
        </label>

        <button type="submit" disabled={loading} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
          {loading ? "Running..." : "Run Discovery"}
        </button>
      </div>

      {result ? (
        <div className={`mt-5 rounded-2xl border p-4 text-sm ${result.ok ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <p className="font-bold">{result.ok ? "Discovery request accepted" : "Discovery not run"}</p>
          <p className="mt-1">{result.message ?? result.error}</p>
          <p className="mt-2 text-xs">SerpAPI configured: {result.serpapiConfigured ? "yes" : "no"}</p>
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No discovery has been run on this page yet. This form does not create fake leads.
        </p>
      )}
    </form>
  );
}
