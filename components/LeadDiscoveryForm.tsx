"use client";

import { FormEvent, useState } from "react";
import { SAVED_LEADS_KEY, SAVED_RUNS_KEY, upsertById, readStorageArray, writeStorageArray, type StoredRun } from "@/lib/clientStorage";

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

type EvidenceSource = {
  source_type: string;
  title: string;
  url?: string;
  snippet?: string;
};

type DiscoveryLead = {
  id: string;
  name: string;
  business_name?: string;
  classification: string;
  source_type: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  best_contact_role?: string;
  contact_status?: string;
  evidence_url?: string;
  evidence_title?: string;
  evidence_snippet?: string;
  evidence_sources?: EvidenceSource[];
  cross_reference_summary?: string;
  enrichment_status?: string;
  short_reason: string;
  detected_signals: string[];
  evidence_confidence: string;
  verification_status: string;
  score_breakdown?: Record<string, number>;
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
  saved_at?: string;
  territory?: string;
  lead_type?: string;
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

function scoreLabel(key: string) {
  const labels: Record<string, string> = {
    referralAccess: "Referral access",
    needSignal: "Need signal",
    nonCompetitor: "Non-competitor",
    contactability: "Contactability",
    crossReferenceStrength: "Cross-reference strength",
    localServiceAreaFit: "Local fit",
    payorFit: "Payor fit",
    evidenceConfidence: "Evidence confidence",
  };
  return labels[key] ?? key;
}

export function LeadDiscoveryForm() {
  const [state, setState] = useState("NJ");
  const [cityOrZip, setCityOrZip] = useState("");
  const [leadType, setLeadType] = useState("daycare");
  const [maxResults, setMaxResults] = useState(10);
  const [radiusMiles, setRadiusMiles] = useState(15);
  const [excludeCompetitors, setExcludeCompetitors] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function saveDiscovery(data: DiscoveryResult) {
    if (!data.ok || !data.leads || data.leads.length === 0) return;
    const now = new Date().toISOString();
    const territory = `${cityOrZip}, ${state}`;
    const enrichedLeads = data.leads.map((lead) => ({ ...lead, saved_at: now, territory, lead_type: leadType }));
    upsertById<DiscoveryLead>(SAVED_LEADS_KEY, enrichedLeads);
    const existingRuns = readStorageArray<StoredRun>(SAVED_RUNS_KEY);
    const run: StoredRun = {
      id: `run-${Date.now()}`,
      createdAt: now,
      territory,
      leadType,
      queries: data.queries ?? [],
      resultsFound: data.leads.length,
      saved: enrichedLeads.length,
      excluded: 0,
      errors: data.providerErrors ?? [],
    };
    writeStorageArray(SAVED_RUNS_KEY, [run, ...existingRuns]);
    setSaveMessage(`Saved ${enrichedLeads.length} leads and 1 research run in this app/browser.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setSelectedLead(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, cityOrZip, leadType, maxResults, radiusMiles, excludeCompetitors }),
      });
      const data = (await response.json()) as DiscoveryResult;
      setResult(data);
      saveDiscovery(data);
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

  const profileLead = selectedLead ?? result?.leads?.[0] ?? null;

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

      {saveMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{saveMessage}</div> : null}

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
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No discovery has been run on this page yet. This form does not create fake leads.
        </p>
      )}

      {result?.leads && result.leads.length > 0 ? (
        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">Live public results</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{result.leads.length} opportunities/signals found</h2>
              </div>
              <p className="text-xs text-slate-500">Click View Profile. Do not outreach without review.</p>
            </div>

            <div className="grid gap-3">
              {result.leads.map((lead) => (
                <article key={lead.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${profileLead?.id === lead.id ? "border-cyan-400" : "border-slate-200"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">{lead.classification}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">{lead.business_name ?? lead.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">Why: {lead.short_reason}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left sm:text-right">
                      <p className="text-xs font-bold text-slate-500">Score</p>
                      <p className="text-2xl font-black text-slate-950">{lead.opportunity_score.total}/100</p>
                      <p className="text-xs text-slate-500">{lead.opportunity_score.classification}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p><span className="font-bold">Phone:</span> {lead.phone ?? "Missing"}</p>
                    <p><span className="font-bold">Address:</span> {lead.address ?? "Missing"}</p>
                    <p><span className="font-bold">Website:</span> {lead.website ? "Found" : "Missing"}</p>
                    <p><span className="font-bold">Best contact:</span> {lead.best_contact_role ?? "Needs enrichment"}</p>
                    <p><span className="font-bold">Sources:</span> {lead.evidence_sources?.length ?? 1}</p>
                    <p><span className="font-bold">Enrichment:</span> {lead.enrichment_status ?? "Needs enrichment"}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {lead.detected_signals.length > 0 ? lead.detected_signals.slice(0, 10).map((signal) => (
                      <span key={signal} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{signal}</span>
                    )) : <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">weak evidence</span>}
                  </div>

                  <button type="button" onClick={() => setSelectedLead(lead)} className="mt-4 rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-100">
                    View lead profile
                  </button>
                </article>
              ))}
            </div>
          </div>

          {profileLead ? (
            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-4 xl:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Internal lead profile</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{profileLead.business_name ?? profileLead.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{profileLead.classification} · {profileLead.source_type}</p>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p><span className="font-bold">Company:</span> {profileLead.business_name ?? profileLead.name}</p>
                <p className="mt-2"><span className="font-bold">Address:</span> {profileLead.address ?? "Missing"}</p>
                <p className="mt-2"><span className="font-bold">Phone:</span> {profileLead.phone ?? "Missing"}</p>
                <p className="mt-2"><span className="font-bold">Website:</span> {profileLead.website ?? "Missing"}</p>
                <p className="mt-2"><span className="font-bold">Target contact role:</span> {profileLead.best_contact_role ?? "Needs enrichment"}</p>
                <p className="mt-2"><span className="font-bold">Contact status:</span> {profileLead.contact_status ?? "Needs enrichment"}</p>
                {typeof profileLead.rating === "number" ? <p className="mt-2"><span className="font-bold">Public rating/reviews:</span> {profileLead.rating} · {profileLead.reviews ?? 0} reviews</p> : null}
              </div>

              <div className="mt-5">
                <p className="font-bold text-slate-950">Score breakdown</p>
                <div className="mt-3 grid gap-2">
                  {Object.entries(profileLead.opportunity_score.breakdown ?? profileLead.score_breakdown ?? {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{scoreLabel(key)}</span>
                      <span className="font-black text-slate-950">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">This is a rule-based referral-opportunity score. It is not a claim that the organization has referrals or that families need ABA.</p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-950">Cross-reference evidence</p>
                <p className="mt-2 text-xs text-slate-500">{profileLead.cross_reference_summary ?? "Needs additional source matching."}</p>
                <div className="mt-3 space-y-2">
                  {(profileLead.evidence_sources ?? [{ source_type: profileLead.source_type, title: profileLead.evidence_title ?? profileLead.name, url: profileLead.evidence_url, snippet: profileLead.evidence_snippet }]).map((source, index) => (
                    <div key={`${source.title}-${index}`} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{source.source_type}</p>
                      <p className="mt-1 font-semibold">{source.title}</p>
                      {source.snippet ? <p className="mt-1 text-xs text-slate-600">{source.snippet}</p> : null}
                    </div>
                  ))}
                </div>
              </div>

              {profileLead.recommendation ? (
                <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-sm text-cyan-950">
                  <p className="font-bold">Next action</p>
                  <p className="mt-1">{profileLead.recommendation.recommended_action}</p>
                  <p className="mt-2 text-xs">{profileLead.recommendation.reason}</p>
                </div>
              ) : null}
            </aside>
          ) : null}
        </section>
      ) : result?.ok ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          Live search returned no qualifying results for this request. Try a nearby city, broader lead type, or uncheck competitor exclusion.
        </section>
      ) : null}
    </div>
  );
}
