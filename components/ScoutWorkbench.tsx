"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronRight,
  Database,
  ExternalLink,
  Globe2,
  MapPinned,
  RotateCcw,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";
import type { ResolvedLead } from "@/lib/intelligence/source-types";
import { canSaveToCrm, saveCrmLead } from "@/lib/crm/local-store";

type Engine = "client" | "rbt" | "bcba";
type TargetState = "MO" | "KS";
type SourceState = { source: string; status: "working" | "complete" | "unavailable"; detail?: string };

type EngineScore = {
  engine: Engine;
  score: number;
  confidence: number;
  coverage: number;
  observedIndicators: number;
  applicableIndicators: number;
};

type RegulatoryRule = {
  id: string;
  domain: string;
  title: string;
  summary: string;
  posture: "PASS" | "REVIEW" | "BLOCK" | "INFO";
  effectiveDate: string;
  sourceUrl: string;
  sourceLabel: string;
};

type SearchResponse = {
  ok: boolean;
  error?: string;
  state?: TargetState;
  engine?: Engine;
  plan?: { lanes: string[]; queries: Array<{ lane: string; query: string }>; safeguards: string[] };
  sourceStatus?: SourceState[];
  browser?: SourceState;
  screened?: number;
  leads?: ResolvedLead[];
  demographics?: {
    geographyName: string;
    geographyKind: string;
    year: number;
    metrics: {
      totalPopulation: number;
      under18: number;
      age0to2: number;
      age3to5: number;
      age6to11: number;
      age12to17: number;
      under18Share: number;
      under18FiveYearGrowth: number | null;
    };
  } | null;
  indicatorSummary?: {
    modelTotal: number;
    observed: number;
    selectedApplicable: number;
    selectedObserved: number;
    coverage: number;
  };
  engineScores?: Record<Engine, EngineScore>;
  regulatoryRules?: RegulatoryRule[];
  territory?: {
    location: string;
    total: number;
    label: string;
    confidence: number;
    coverage?: number;
    reasoning: string[];
  };
  errors?: string[];
};

const ENGINE_PROMPTS: Record<Engine, string> = {
  client: "Find the strongest client-growth territories and public referral organizations, and explain the evidence behind each opportunity.",
  rbt: "Find RBT hiring pressure, talent supply, employers, training signals and recruiting opportunities, with Missouri/Kansas compliance context.",
  bcba: "Find BCBA/LBA hiring pressure, licensed analyst supply, employers and recruiting opportunities, with state licensure context.",
};

const ENGINE_LABELS: Record<Engine, string> = { client: "Clients", rbt: "RBTs", bcba: "BCBAs" };
const STATE_NAMES: Record<TargetState, string> = { MO: "Missouri", KS: "Kansas" };
const DEFAULT_SOURCE_STATES: SourceState[] = [
  { source: "U.S. Census ACS", status: "working", detail: "Child-population context" },
  { source: "CMS NPPES", status: "working", detail: "Public provider cross-reference" },
  { source: "Public Web Search", status: "working", detail: "Market and hiring fallback" },
  { source: "Public Website Enrichment", status: "working", detail: "Contact/service verification" },
];

export function ScoutWorkbench() {
  const [engine, setEngine] = useState<Engine>("client");
  const [targetState, setTargetState] = useState<TargetState>("MO");
  const [query, setQuery] = useState(ENGINE_PROMPTS.client);
  const [location, setLocation] = useState(STATE_NAMES.MO);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [selected, setSelected] = useState<ResolvedLead | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const controllerRef = useRef<AbortController | null>(null);
  const leads = useMemo(() => response?.leads ?? [], [response]);
  const score = response?.engineScores?.[response.engine ?? engine] ?? null;

  function selectEngine(next: Engine) {
    const queryIsPreset = Object.values(ENGINE_PROMPTS).includes(query);
    setEngine(next);
    if (queryIsPreset) setQuery(ENGINE_PROMPTS[next]);
    setResponse(null);
    setSelected(null);
  }

  function selectState(next: TargetState) {
    const oldStateOnly = !location.trim() || location.trim() === STATE_NAMES[targetState] || location.trim() === targetState;
    setTargetState(next);
    if (oldStateOnly) setLocation(STATE_NAMES[next]);
    setResponse(null);
    setSelected(null);
  }

  function resetScout() {
    controllerRef.current?.abort();
    setRunning(false);
    setQuery(ENGINE_PROMPTS[engine]);
    setLocation(STATE_NAMES[targetState]);
    setResponse(null);
    setSelected(null);
  }

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
        body: JSON.stringify({ query, location, state: targetState, engine, maxResults: 20 }),
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
    <div className="scoutShellV3">
      <section className="scoutHeroV3">
        <span className="eyebrow">ABA Engine · Missouri + Kansas</span>
        <div className="scoutHeadlineRow">
          <h1>Scout</h1>
          <p>Cross-reference public demand, providers, referral networks, workforce signals and current state/payer rules.</p>
        </div>

        <div className="scoutControlDeck" aria-label="Scout research mode">
          <div className="segmentedControl" aria-label="Lead engine">
            {(["client", "rbt", "bcba"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={engine === item ? "segmentButton active" : "segmentButton"}
                aria-pressed={engine === item}
                onClick={() => selectEngine(item)}
              >
                {ENGINE_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="segmentedControl stateControl" aria-label="Target state">
            {(["MO", "KS"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={targetState === item ? "segmentButton active" : "segmentButton"}
                aria-pressed={targetState === item}
                onClick={() => selectState(item)}
              >
                {STATE_NAMES[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="scoutComposerV3">
          <textarea
            aria-label="Research request"
            rows={3}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Research ${ENGINE_LABELS[engine].toLowerCase()} in ${STATE_NAMES[targetState]}...`}
          />
          <div className="scoutComposerFooter">
            <label className="scoutLocation">
              <MapPinned size={15} aria-hidden="true" />
              <input
                className="scoutLocationInput"
                aria-label="Target city, ZIP, county or state"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={`City, ZIP or county in ${STATE_NAMES[targetState]}`}
              />
            </label>
            <div className="scoutComposerButtons">
              <button type="button" className="scoutResetButton" onClick={resetScout} aria-label="Reset Scout">
                <RotateCcw size={15} aria-hidden="true" />
              </button>
              {running ? (
                <button type="button" className="scoutStopButton" onClick={() => controllerRef.current?.abort()}><X size={15} aria-hidden="true" /> Stop</button>
              ) : (
                <button type="button" className="scoutRunButton" onClick={run} disabled={query.trim().length < 3} aria-label="Run research">
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {(running || response) && (
        <section className="researchResults" aria-live="polite">
          {response?.error && <div className="errorCard">{response.error}</div>}
          {response?.errors && response.errors.length > 0 && (
            <div className="warningCard">{response.errors.slice(0, 4).map((error) => <p key={error}>{error}</p>)}</div>
          )}

          {response?.territory && score && response.indicatorSummary && (
            <>
              <div className="engineScoreStrip" aria-label={`${ENGINE_LABELS[response.engine ?? engine]} intelligence summary`}>
                <div className="engineMetric"><span>Opportunity</span><strong>{score.score}</strong><small>{response.territory.label}</small></div>
                <div className="engineMetric"><span>Confidence</span><strong>{score.confidence}%</strong><small>evidence quality</small></div>
                <div className="engineMetric"><span>Coverage</span><strong>{score.coverage}%</strong><small>applicable model</small></div>
                <div className="engineMetric"><span>Indicators</span><strong>{response.indicatorSummary.selectedObserved}</strong><small>of {response.indicatorSummary.selectedApplicable} applicable · {response.indicatorSummary.modelTotal} total</small></div>
              </div>

              {response.engineScores && (
                <div className="crossEngineStrip" aria-label="Same-evidence engine scores">
                  {(["client", "rbt", "bcba"] as const).map((item) => (
                    <div key={item} className={(response.engine ?? engine) === item ? "crossEngineCard active" : "crossEngineCard"}>
                      <span>{ENGINE_LABELS[item]}</span>
                      <b>{response.engineScores?.[item].score ?? 0}/100</b>
                    </div>
                  ))}
                </div>
              )}

              {response.demographics && (
                <div className="demographicStrip" aria-label={`${response.demographics.geographyName} demographic context`}>
                  <div className="demographicCard"><span>Under 18</span><b>{formatCount(response.demographics.metrics.under18)}</b></div>
                  <div className="demographicCard"><span>Age 0–5</span><b>{formatCount(response.demographics.metrics.age0to2 + response.demographics.metrics.age3to5)}</b></div>
                  <div className="demographicCard"><span>5-year child trend</span><b>{formatGrowth(response.demographics.metrics.under18FiveYearGrowth)}</b></div>
                </div>
              )}

              <article className="territoryInsight">
                <div className="scoreOrb territoryScore"><strong>{response.territory.total}</strong><span>{response.engine ?? engine}</span></div>
                <div>
                  <span className="eyebrow">{response.territory.location} · {response.territory.confidence}% confidence</span>
                  <h2>{response.territory.label} {ENGINE_LABELS[response.engine ?? engine].toLowerCase()} opportunity</h2>
                  <p>{response.territory.reasoning.length ? response.territory.reasoning.join(" · ") : "More independent evidence is needed before this territory can be scored confidently."}</p>
                </div>
              </article>
            </>
          )}

          <details className="sourceDisclosure">
            <summary><span>Evidence sources</span><span>{response?.sourceStatus?.filter((item) => item.status === "complete").length ?? 0} ready</span></summary>
            <div className="sourceRail">
              {(response?.sourceStatus ?? DEFAULT_SOURCE_STATES.map((source) => ({ ...source, status: running ? "working" as const : source.status }))).map((source) => (
                <SourceRow key={source.source} source={source} />
              ))}
              {response?.browser && <SourceRow source={response.browser} />}
            </div>
          </details>

          {response?.regulatoryRules && response.regulatoryRules.length > 0 && (
            <details className="ruleDisclosure">
              <summary><span>Rules + payer gates</span><span>{response.regulatoryRules.length} current rules</span></summary>
              <div className="ruleList">
                {response.regulatoryRules.map((rule) => (
                  <div className="ruleRow" key={rule.id}>
                    <span className={`ruleBadge ${rule.posture}`}>{rule.posture}</span>
                    <div className="ruleCopy"><b>{rule.title}</b><p>{rule.summary} · Effective {rule.effectiveDate}</p></div>
                    <a className="ruleLink" href={rule.sourceUrl} target="_blank" rel="noreferrer">Official <ExternalLink size={10} aria-hidden="true" /></a>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="resultSummary">
            <div><strong>{leads.length}</strong> leads/signals <span>·</span> {response?.screened ?? 0} records screened</div>
            {response?.territory && <div className="territoryPill"><span>{response.territory.location}</span><b>{response.territory.total}/100 · {response.territory.label}</b></div>}
          </div>

          <div className="leadList">
            {leads.map((lead) => (
              <article className="leadCard" key={lead.id}>
                <button type="button" className="leadOpen" onClick={() => setSelected(lead)}>
                  <div className="scoreOrb"><strong>{lead.score}</strong><span>{lead.kind.replace("_", " ")}</span></div>
                  <div className="leadMain">
                    <h2>{lead.name}</h2>
                    <p>{lead.domain || lead.location || "Public source"}</p>
                    <div className="signalRow">
                      <span>{lead.evidence.length} evidence</span>
                      <span>{lead.confidence}% confidence</span>
                      <span>{lead.emails.length + lead.phones.length} contacts</span>
                      {lead.signals.slice(0, 2).map((signal) => <span key={signal}>{signal}</span>)}
                    </div>
                    <div className="counterpartyLine">{lead.reasons.slice(0, 2).join(" · ")}</div>
                  </div>
                  <ChevronRight size={18} className="chevron" aria-hidden="true" />
                </button>
                {canSaveToCrm(lead) ? (
                  <button type="button" className="saveLeadButton" onClick={() => saveLead(lead)}>
                    {savedIds.has(lead.id) ? <><Check size={14} /> Saved</> : <><Save size={14} /> CRM</>}
                  </button>
                ) : <span className="saveLeadButton">Signal</span>}
              </article>
            ))}
          </div>

          {!running && response?.ok && leads.length === 0 && (
            <div className="emptyDark">No qualified public leads were returned. The engine does not insert demo leads or infer private family health information.</div>
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
          <button type="button" className="iconButton" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="scoreHero">
          <div className="bigScore">{lead.score}</div>
          <div><b>Why this reached the lead feed</b><p>{lead.reasons.join(" · ")}</p></div>
        </div>

        <div className="statusStrip">
          <span className="statusChip"><Globe2 size={12} /> {lead.evidence.length} evidence</span>
          <span className="statusChip"><Users size={12} /> {lead.emails.length + lead.phones.length} contacts</span>
          <span className="statusChip"><Database size={12} /> {lead.domain || "domain unresolved"}</span>
        </div>

        <section className="dossierSection">
          <div className="sectionTitleRow">
            <h3>Public contact & qualification</h3>
            {canSaveToCrm(lead) ? (
              <button type="button" className="miniPrimary" onClick={onSave}>{saved ? <><Check size={14}/> Saved</> : <><Save size={14}/> Save to CRM</>}</button>
            ) : <span className="statusChip">Territory signal only</span>}
          </div>
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

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 100_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function formatGrowth(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Needs history";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
