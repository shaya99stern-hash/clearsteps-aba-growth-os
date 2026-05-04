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

type DiscoveryLead = {
  id: string;
  name: string;
  classification: string;
  source_type: string;
  evidence_url?: string;
  evidence_title?: string;
  evidence_snippet?: string;
  short_reason: string;
  detected_signals: string[];
  evidence_confidence: string;
  verification_status: string;
  opportunity_score: {
    total: number;
    classification: string;
    breakdown?: Record<string, number>;
    reasoning?: string[];
  };
  recommendation?: {
    recommended_action: string;
    reason: string;
  };
};

type DiscoveryResult = {
  ok: boolean;
  serpapiConfigured: boolean;
  status?: string;
  message?: string;
  error?: string;
  request?: Record<string, unknown>;
  queries?: string[];
  providerErrors?: string[];
  leads?: DiscoveryLead[];
};

export function LeadDiscoveryForm() {
  const [state, setState] = useState("NJ");
  const [cityOrZip, setCityOrZip] = useState("");
  const [leadType, setLeadType] = useState("daycare");
  const [maxResults, setMaxResults] = useState(10);
  const [radiusMiles, setRadiusMiles] = useState(15);
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
        body: JSON.stringify({ state, cityOrZip, leadType, maxResults, radiusMiles, excludeCompetitors }),
      });
      const data = (await response.json()) as DiscoveryResult;
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        serpapiConfigured: false,
        error: error instanceof Error ? error.message : "Discovery request failed.",
        leads: [],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
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

        <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_0.8fr_1.2fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Max results</span>
            <input type="number" min="1" max="50" value={maxResults} onChange={(event) => setMaxResults(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Radius miles</span>
            <input type="number" min="1" max="100" value={radiusMiles} onChange={(event) => setRadiusMiles(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={excludeCompetitors} onChange={(event) => setExcludeCompetitors(event.target.checked)} className="h-4 w-4" />
            Exclude competitors from referral leads
          </label>

          <button type="submit" disabled={loading} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            {loading ? "Running..." : "Run Discovery"}
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          This runs public organization-level search only. It does not collect parent names, child names, diagnosis data, or private group data.
        </p>
      </form>

      {result ? (
        <section className={`rounded-3xl border p-5 text-sm ${result.ok ? "border-cyan-200 bg-cyan-50 text-cyan-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
          <p className="font-bold">{result.ok ? "Discovery completed" : "Discovery not run"}</p>
          <p className="mt-1">{result.message ?? result.error}</p>
          <p className="mt-2 text-xs">SerpAPI configured: {result.serpapiConfigured ? "yes" : "no"}</p>
          {result.queries && result.queries.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">Queries used</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.queries.map((query) => <span key={query} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">{query}</span>)}
              </div>
            </div>
          ) : null}
          {result.providerErrors && result.providerErrors.length > 0 ? (
            <div className="mt-4 rounded-2xl bg-white/70 p-3 text-xs text-amber-900">
              <p className="font-bold">Provider warnings</p>
              <ul className="mt-1 list-disc pl-4">
                {result.providerErrors.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No discovery has been run on this page yet. This form does not create fake leads.
        </p>
      )}

      {result?.leads && result.leads.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">Live public results</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{result.leads.length} opportunities/signals found</h2>
            </div>
            <p className="text-xs text-slate-500">Review evidence before outreach.</p>
          </div>

          <div className="grid gap-3">
            {result.leads.map((lead) => (
              <article key={lead.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">{lead.classification}</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">{lead.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">Why: {lead.short_reason}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left sm:text-right">
                    <p className="text-xs font-bold text-slate-500">Score</p>
                    <p className="text-2xl font-black text-slate-950">{lead.opportunity_score.total}/100</p>
                    <p className="text-xs text-slate-500">{lead.opportunity_score.classification}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {lead.detected_signals.length > 0 ? lead.detected_signals.slice(0, 10).map((signal) => (
                    <span key={signal} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{signal}</span>
                  )) : <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">weak evidence</span>}
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="font-bold">Evidence title:</span> {lead.evidence_title || "No title returned"}</p>
                  <p className="mt-2"><span className="font-bold">Snippet:</span> {lead.evidence_snippet || "No snippet returned"}</p>
                  <p className="mt-2"><span className="font-bold">Confidence:</span> {lead.evidence_confidence} · <span className="font-bold">Status:</span> {lead.verification_status}</p>
                  {lead.evidence_url ? <a className="mt-3 inline-block font-bold text-cyan-700 underline" href={lead.evidence_url} target="_blank" rel="noreferrer">Open source</a> : null}
                </div>

                {lead.recommendation ? (
                  <p className="mt-4 text-sm text-slate-700"><span className="font-bold">Next action:</span> {lead.recommendation.recommended_action}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : result?.ok ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          Live search returned no qualifying results for this request. Try a nearby city, broader lead type, or uncheck competitor exclusion.
        </section>
      ) : null}
    </div>
  );
}
