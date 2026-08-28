"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowUp, Check, ChevronRight, Database, Filter, Globe2, MapPinned, Save, Search, Users, X } from "lucide-react";
import type { ResolvedLead } from "@/lib/intelligence/source-types";
import { canSaveToCrm, saveCrmLead } from "@/lib/crm/local-store";

type SourceState = { source: string; status: "working" | "complete" | "unavailable"; detail?: string };

type SearchResponse = {
  ok: boolean;
  error?: string;
  plan?: { lanes: string[]; queries: Array<{ lane: string; query: string }>; safeguards: string[] };
  sourceStatus?: SourceState[];
  browser?: SourceState;
  screened?: number;
  leads?: ResolvedLead[];
  territory?: {
    location: string;
    total: number;
    label: string;
    confidence: number;
    reasoning: string[];
  };
  errors?: string[];
};

const DEFAULT_QUERY = "Find underserved ABA territories and the strongest daycare, psychologist, pediatric and community referral opportunities.";

export function ScoutWorkbench() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [location, setLocation] = useState("Lakewood, NJ");
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [selected, setSelected] = useState<ResolvedLead | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const controllerRef = useRef<AbortController | null>(null);
  const leads = useMemo(() => response?.leads ?? [], [response]);

  async function run() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    setResponse(null);
    setSelected(null);
    try {
      const result = await fetch("/api/intelligence/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, location, maxResults: 20 }),
        signal: controller.signal,
      });
      const json = await result.json() as SearchResponse;
      setResponse(json);
    } catch (error) {
      if (!controller.signal.aborted) {
        setResponse({ ok: false, error: error instanceof Error ? error.message : "Research failed." });
      }
    } finally {
      if (controllerRef.current === controller) setRunning(false);
    }
  }

  function saveLead(lead: ResolvedLead) {
    if (!canSaveToCrm(lead)) return;
    saveCrmLead(lead);
    setSavedIds((current) => new Set(current).add(lead.id));
  }

  return (
    <div className="scoutShell">
      <section className="scoutHero">
        <span className="eyebrow">ABA territory + growth intelligence</span>
        <h1>Find where Clear Steps should move next.</h1>
        <p>
          Search public sources, cross-reference organizations and community demand, score territory opportunity,
          and move qualified referral or talent leads directly into the CRM.
        </p>

        <div className="scoutComposer">
          <textarea
            aria-label="Research request"
            rows={4}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find high-need ABA territories, referral sources, RBTs, BCBAs..."
          />
          <div className="composerMeta">
            <label className="locationField">
              <MapPinned size={15} />
              <input aria-label="Target location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, ZIP, county or state" />
            </label>
            <div className="composerActions">
              <button type="button" className="quietButton"><Filter size={15} /> Filters</button>
              {running ? (
                <button type="button" className="stopButton" onClick={() => controllerRef.current?.abort()}><X size={15} /> Stop</button>
              ) : (
                <button type="button" className="runButton" onClick={run} disabled={query.trim().length < 3} aria-label="Run research">
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {(running || response) && (
        <section className="researchResults" aria-live="polite">
          <div className="resultSummary">
            <div>
              <strong>{leads.length}</strong> qualified
              <span>·</span>
              {response?.screened ?? 0} screened
            </div>
            {response?.territory && (
              <div className="territoryPill">
                <span>{response.territory.location}</span>
                <b>{response.territory.total}/100 · {response.territory.label}</b>
              </div>
            )}
          </div>

          <div className="sourceRail">
            {(response?.sourceStatus ?? [
              { source: "Public Web Search", status: running ? "working" : "complete", detail: "API-key-free discovery" } as SourceState,
            ]).map((source) => <SourceRow key={source.source} source={source} />)}
            {response?.browser && <SourceRow source={response.browser} />}
          </div>

          {response?.error && <div className="errorCard">{response.error}</div>}
          {response?.errors && response.errors.length > 0 && <div className="warningCard">{response.errors.slice(0, 4).map((error) => <p key={error}>{error}</p>)}</div>}

          {response?.territory && (
            <article className="territoryInsight">
              <div className="scoreOrb territoryScore"><strong>{response.territory.total}</strong><span>demand</span></div>
              <div>
                <span className="eyebrow">{response.territory.confidence}% evidence confidence</span>
                <h2>{response.territory.label} opportunity territory</h2>
                <p>{response.territory.reasoning.join(" · ")}</p>
              </div>
            </article>
          )}

          <div className="leadList">
            {leads.map((lead) => (
              <article className="leadCard" key={lead.id}>
                <button type="button" className="leadOpen" onClick={() => setSelected(lead)}>
                  <div className="scoreOrb"><strong>{lead.score}</strong><span>{lead.kind.replace("_", " ")}</span></div>
                  <div className="leadMain">
                    <h2>{lead.name}</h2>
                    <p>{lead.domain || lead.location || "Public source"}</p>
                    <div className="signalRow">
                      <span>{lead.evidence.length} sources</span>
                      <span>{lead.confidence}% confidence</span>
                      <span>{lead.emails.length + lead.phones.length} contacts</span>
                      {lead.signals.slice(0, 3).map((signal) => <span key={signal}>{signal}</span>)}
                    </div>
                    <div className="counterpartyLine">{lead.reasons.slice(0, 2).join(" · ")}</div>
                  </div>
                  <ChevronRight size={19} className="chevron" />
                </button>
                {canSaveToCrm(lead) ? (
                  <button type="button" className="saveLeadButton" onClick={() => saveLead(lead)}>
                    {savedIds.has(lead.id) ? <><Check size={15} /> Saved</> : <><Save size={15} /> CRM</>}
                  </button>
                ) : (
                  <span className="saveLeadButton">Signal only</span>
                )}
              </article>
            ))}
          </div>

          {!running && response?.ok && leads.length === 0 && (
            <div className="emptyDark">No qualified public leads were returned. Clear Steps does not insert demo leads.</div>
          )}
        </section>
      )}

      {selected && <LeadDossier lead={selected} onClose={() => setSelected(null)} onSave={() => saveLead(selected)} saved={savedIds.has(selected.id)} />}
    </div>
  );
}

function SourceRow({ source }: { source: SourceState }) {
  return (
    <div className="sourceItem">
      <i className={`sourceDot ${source.status}`} />
      <div><b>{source.source}</b><span>{source.detail}</span></div>
    </div>
  );
}

function LeadDossier({ lead, onClose, onSave, saved }: { lead: ResolvedLead; onClose: () => void; onSave: () => void; saved: boolean }) {
  return (
    <div className="sheetBackdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="sheet" role="dialog" aria-modal="true" aria-label={`${lead.name} evidence dossier`}>
        <div className="sheetHandle" />
        <header className="sheetHeader">
          <div>
            <span className="eyebrow">{lead.kind.replace("_", " ")} · {lead.confidence}% confidence</span>
            <h2>{lead.name}</h2>
          </div>
          <button className="iconButton" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="scoreHero">
          <div className="bigScore">{lead.score}</div>
          <div>
            <b>Why this reached the lead feed</b>
            <p>{lead.reasons.join(" · ")}</p>
          </div>
        </div>

        <div className="statusStrip">
          <span className="statusChip"><Globe2 size={12} /> {lead.evidence.length} evidence</span>
          <span className="statusChip"><Users size={12} /> {lead.emails.length + lead.phones.length} contacts</span>
          <span className="statusChip"><Database size={12} /> {lead.domain || "domain unresolved"}</span>
        </div>

        <section className="dossierSection">
          <div className="sectionTitleRow"><h3>Public contact & qualification</h3>{canSaveToCrm(lead) ? <button className="miniPrimary" onClick={onSave}>{saved ? <><Check size={14}/> Saved</> : <><Save size={14}/> Save to CRM</>}</button> : <span className="statusChip">Territory signal only</span>}</div>
          <div className="factCard">
            <div><span>Lead type</span><b>{lead.kind.replace("_", " ")}</b></div>
            <div><span>Evidence confidence</span><b>{lead.confidence}%</b></div>
            <div><span>Email</span><b>{lead.emails[0] || "Not found"}</b></div>
            <div><span>Phone</span><b>{lead.phones[0] || "Not found"}</b></div>
          </div>
          {lead.unknowns.length > 0 && <div className="unknownCard"><b>Still needs verification</b>{lead.unknowns.map((item) => <p key={item}>{item}</p>)}</div>}
        </section>

        <section className="dossierSection">
          <h3>Evidence graph</h3>
          <div className="stackList">
            {lead.evidence.map((item) => (
              <a className="stackRow evidenceRow" key={item.id} href={item.url} target="_blank" rel="noreferrer">
                <div><b>{item.title}</b><span>{item.sourceId} · {item.query}</span><p>{item.snippet}</p></div>
                <Search size={15} />
              </a>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
