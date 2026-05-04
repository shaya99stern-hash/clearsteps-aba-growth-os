"use client";

import { useMemo, useState } from "react";
import type { Connector, DiscoveryOpportunity, QueryFamily, SearchQuery } from "@/lib/domain/types";

type DiscoveryResponse = {
  status: string;
  error?: string;
  providerStatus: Connector;
  queries: SearchQuery[];
  opportunities: DiscoveryOpportunity[];
  researchRun?: {
    run_name: string;
    status: string;
    results_count: number;
    errors: string[];
  } | null;
};

export function DiscoveryConsole({ queryFamilies, providerConfigured }: { queryFamilies: QueryFamily[]; providerConfigured: boolean }) {
  const [location, setLocation] = useState("");
  const [sourceType, setSourceType] = useState("all");
  const [resultLimit, setResultLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DiscoveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewQueries = useMemo(() => {
    const selected = sourceType === "all" ? queryFamilies : queryFamilies.filter((family) => family.id === sourceType);
    if (!location.trim()) return [];
    return selected.flatMap((family) => family.templates.slice(0, 3).map((template) => template.replace("[location]", location.trim())));
  }, [location, queryFamilies, sourceType]);

  async function runDiscovery() {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await fetch("/api/discovery/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, sourceType, resultLimit, limitPerFamily: 2 }),
      });
      const json = (await result.json()) as DiscoveryResponse;
      setResponse(json);
      if (!result.ok) setError(json.error ?? "Discovery failed.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discovery request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="discovery" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Lead Discovery</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Evidence-first referral discovery</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Generate targeted ABA referral queries, run live public search only when SerpAPI is configured, and classify results as referral sources, demand signals, competitors, directories, or weak results.
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${providerConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          SerpAPI: {providerConfigured ? "configured" : "not configured"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_1fr_0.6fr]">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Target location</span>
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Example: Lakewood, NJ" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Source type</span>
          <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600">
            <option value="all">All query families</option>
            {queryFamilies.map((family) => <option key={family.id} value={family.id}>{family.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Limit/query</span>
          <input type="number" min="1" max="10" value={resultLimit} onChange={(event) => setResultLimit(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={runDiscovery} disabled={loading || !location.trim()} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
          {loading ? "Running discovery..." : "Run Discovery"}
        </button>
        {!providerConfigured && <p className="text-sm text-amber-800">Search provider not configured. Add SERPAPI_API_KEY to enable live public web discovery. Query generation still works.</p>}
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Generated query preview</p>
        {previewQueries.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Enter a location to preview query families.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {previewQueries.slice(0, 12).map((query) => <span key={query} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">{query}</span>)}
          </div>
        )}
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {response && (
        <div className="mt-5 space-y-4">
          {response.researchRun && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-950">{response.researchRun.run_name}</p>
              <p className="mt-1 text-sm text-slate-600">Status: {response.researchRun.status} · Results: {response.researchRun.results_count}</p>
              {response.researchRun.errors.length > 0 && <p className="mt-2 text-sm text-amber-800">Errors: {response.researchRun.errors.join(" | ")}</p>}
            </div>
          )}

          {response.opportunities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
              No live opportunities were created. This is correct when no provider is configured or no results were returned. No fake data was inserted.
            </div>
          ) : (
            <div className="grid gap-3">
              {response.opportunities.map((opportunity) => (
                <article key={opportunity.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-950">{opportunity.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">Why: {opportunity.short_reason}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-slate-500">{opportunity.classification}</p>
                      <p className="text-lg font-bold text-slate-950">{opportunity.opportunity_score.total}/100</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {opportunity.detected_signals.slice(0, 8).map((signal) => <span key={signal} className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{signal}</span>)}
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <p><strong>Evidence:</strong> {opportunity.evidence_title}</p>
                    <p className="mt-1"><strong>Snippet:</strong> {opportunity.evidence_snippet || "No snippet returned."}</p>
                    <a className="mt-2 inline-block text-cyan-700 underline" href={opportunity.evidence_url} target="_blank" rel="noreferrer">Open source</a>
                  </div>
                  <p className="mt-3 text-sm text-slate-700"><strong>Next action:</strong> {opportunity.recommendation.recommended_action}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
