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
import type { ClientGrowthPlan } from "@/lib/intelligence/client-growth";
import { ClientGrowthPanel } from "./ClientGrowthPanel";
import { CountyJoinsPanel } from "./CountyJoinsPanel";
import type { ScoutDataJoins } from "@/lib/intelligence/joins/scout";
import { canSaveToCrm, saveCrmLead } from "@/lib/crm/local-store";
import { recordScoutRun } from "@/lib/intelligence/scout-history";
import { buildLeadEvidenceGraph } from "@/lib/intelligence/signals/lead-evidence-graph";
import { AGE_BANDS, type YouthAgeBand, type YouthLeadQualification } from "@/lib/intelligence/signals/youth-qualification";

type Engine = "client" | "rbt" | "bcba";
type TargetState = "MO" | "KS" | "CO";
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
  ageBand?: YouthAgeBand | null;
  clientGrowth?: ClientGrowthPlan | null;
  communityNetworks?: Array<{title:string;url:string;snippet:string;sourceId:string}>;
  youthQualifications?: Record<string, YouthLeadQualification>;
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
      age3to17: number;
      ages2to18: number | null;
      ageCohortNote: string;
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
  scoreReliability?: Record<Engine, {
    grade: "insufficient" | "preliminary" | "supported";
    displayScore: number | null;
    label: string;
    reasons: string[];
  }>;
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
  providerReputation?: Record<string,{
    organizationId:string;
    organizationName:string;
    distinctPublishers:number;
    verifiedReviewCount:0;
    finding:"unverified";
    guidance:string;
    reviews:Array<{
      url:string;
      publisher:string;
      access:"link_only"|"third_party_context";
      verification:"not_verified";
    }>;
    independentThemes?: {
      status:"corroborated"|"unconfirmed"|"no_public_evidence";
      reviewLinks:Array<{platform:string;url:string;linkOnly:true;source:"indexed_business_page"|"external_search"}>;
      publicThemes:Array<{theme:string;sentiment:"positive"|"concern"|"mixed";publishers:number;sources:string[];independentlyCorroborated:boolean}>;
      note:string;
    };
  }>;
  dataJoins?: ScoutDataJoins | null;
  publicSignals?: {
    inspected: number;
    supportedChecks: number;
    observations: Array<{ indicatorId: string }>;
    clues: Array<{
      indicatorId: string; name: string; group: string;
      sourceCount: number; corroborated: boolean;
      sourceDomains: string[]; geographySupported: boolean; ageSupported: boolean;
    }>;
    crossChecks: Array<{
      id: string; title: string; status: "supported" | "partial" | "unobserved"; sourceCount: number;
    }>;
  };
};

const ENGINE_PROMPTS: Record<Engine, string> = {
  client: "Find areas where families can access your ABA services, validate public demand and staffing, and create actions that attract consenting family inquiries for ages 2–18.",
  rbt: "Find RBT hiring pressure, talent supply, employers, training signals and recruiting opportunities, with Missouri/Kansas/Colorado compliance context.",
  bcba: "Find BCBA/LBA hiring pressure, licensed analyst supply, employers and recruiting opportunities, with state licensure context.",
};

const ENGINE_LABELS: Record<Engine, string> = { client: "Clients", rbt: "RBTs", bcba: "BCBAs" };
const STATE_NAMES: Record<TargetState, string> = { MO: "Missouri", KS: "Kansas", CO: "Colorado" };
const DEFAULT_SOURCE_STATES: SourceState[] = [
  { source: "U.S. Census ACS", status: "working", detail: "Child-population context" },
  { source: "CMS NPPES", status: "working", detail: "Public provider cross-reference" },
  { source: "Public Web Search", status: "working", detail: "Market and hiring fallback" },
  { source: "Public Website Enrichment", status: "working", detail: "Contact/service verification" },
];

export function ScoutWorkbench({
  initialEngine = "client",
  initialState = "MO",
  initialQuery = "",
  initialLocation = "",
}: {
  initialEngine?: Engine;
  initialState?: TargetState;
  initialQuery?: string;
  initialLocation?: string;
}) {
  const [engine, setEngine] = useState<Engine>(initialEngine);
  const [targetState, setTargetState] = useState<TargetState>(initialState);
  const [ageBand, setAgeBand] = useState<YouthAgeBand>("2-18");
  const [query, setQuery] = useState(initialQuery || ENGINE_PROMPTS[initialEngine]);
  const [location, setLocation] = useState(initialLocation || STATE_NAMES[initialState]);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [selected, setSelected] = useState<ResolvedLead | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [historyResult, setHistoryResult] = useState<"saved" | "unavailable" | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const leads = useMemo(() => response?.leads ?? [], [response]);
  const score = response?.engineScores?.[response.engine ?? engine] ?? null;
  const reliability = response?.scoreReliability?.[response.engine ?? engine];

  function selectEngine(next: Engine) {
    controllerRef.current?.abort();
    setRunning(false);
    setHistoryResult(null);
    const queryIsPreset = Object.values(ENGINE_PROMPTS).includes(query);
    setEngine(next);
    if (queryIsPreset) setQuery(ENGINE_PROMPTS[next]);
    setResponse(null);
    setSelected(null);
  }

  function selectState(next: TargetState) {
    controllerRef.current?.abort();
    setRunning(false);
    setHistoryResult(null);
    const oldStateOnly = !location.trim() || location.trim() === STATE_NAMES[targetState] || location.trim() === targetState;
    setTargetState(next);
    if (oldStateOnly) setLocation(STATE_NAMES[next]);
    setResponse(null);
    setSelected(null);
  }

  function resetScout() {
    controllerRef.current?.abort();
    setRunning(false);
    setHistoryResult(null);
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
    setHistoryResult(null);
    setResponse(null);
    setSelected(null);
    try {
      const result = await fetch("/api/intelligence/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, location, state: targetState, engine, ageBand, maxResults: 20 }),
        signal: controller.signal,
      });
      const json = await result.json() as SearchResponse;
      if (controller.signal.aborted) return;
      const stored = json.ok && json.territory
        ? recordScoutRun(json, { query, location, state: targetState, engine })
        : null;
      setHistoryResult(stored === null ? null : stored ? "saved" : "unavailable");
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
        <span className="eyebrow">ABA Engine · Missouri + Kansas + Colorado</span>
        <div className="scoutHeadlineRow">
          <h1>Scout</h1>
          <p>Find where families may need your ABA services, improve local visibility and plan RBT coverage. Public research never identifies individual children.</p>
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
            {(["MO", "KS", "CO"] as const).map((item) => (
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

        {engine === "client" && (
          <label className="scoutAgeFocus" htmlFor="scout-age-focus">
            <span>Children&apos;s service age focus</span>
            <select
              id="scout-age-focus"
              aria-label="Client age focus"
              value={ageBand}
              onChange={(event) => {
                controllerRef.current?.abort();
                setRunning(false);
                setResponse(null);
                setSelected(null);
                setAgeBand(event.target.value as YouthAgeBand);
              }}
            >
              {(Object.keys(AGE_BANDS) as YouthAgeBand[]).map((band) => (
                <option key={band} value={band}>{AGE_BANDS[band].label}</option>
              ))}
            </select>
          </label>
        )}

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

          {response?.clientGrowth && <ClientGrowthPanel key={response.clientGrowth.location+response.clientGrowth.ageBand} plan={response.clientGrowth} />}

          {response?.territory && score && response.indicatorSummary && (
            <>
              <div className="engineScoreStrip" aria-label={`${ENGINE_LABELS[response.engine ?? engine]} intelligence summary`}>
                <div className="engineMetric"><span>Opportunity</span><strong>{reliability?.displayScore ?? "—"}</strong><small>{reliability?.label ?? "Evidence review"}</small></div>
                <div className="engineMetric"><span>Confidence</span><strong>{score.confidence}%</strong><small>evidence quality</small></div>
                <div className="engineMetric"><span>Coverage</span><strong>{score.coverage}%</strong><small>applicable model</small></div>
                <div className="engineMetric"><span>Indicators</span><strong>{response.indicatorSummary.selectedObserved}</strong><small>of {response.indicatorSummary.selectedApplicable} applicable · {response.indicatorSummary.modelTotal} total</small></div>
              </div>

              {response.engineScores && (
                <div className="crossEngineStrip" aria-label="Same-evidence engine scores">
                  {(["client", "rbt", "bcba"] as const).map((item) => (
                    <div key={item} className={(response.engine ?? engine) === item ? "crossEngineCard active" : "crossEngineCard"}>
                      <span>{ENGINE_LABELS[item]}</span>
                      <b>{response.scoreReliability?.[item]?.displayScore == null ? "Needs evidence" : (response.scoreReliability?.[item]?.displayScore + "/100")}</b>
                    </div>
                  ))}
                </div>
              )}

              {reliability?.grade === "insufficient" && (
                <div className="warningCard" role="status">
                  <b>Research incomplete — no reliable territory opportunity rating yet.</b>
                  {reliability.reasons.map((reason) => <p key={reason}>{reason}</p>)}
                  <p>A high average across just a few indicators is not proof of strong market demand. Keep researching other independent sources.</p>
                </div>
              )}

              {response.demographics && (
                <div className="demographicStrip" aria-label={`${response.demographics.geographyName} demographic context`}>
                  {response.demographics.metrics.ages2to18 != null && (
                    <div className="demographicCard"><span>Exact ages 2–18</span><b>{formatCount(response.demographics.metrics.ages2to18)}</b></div>
                  )}
                  <div className="demographicCard"><span>Ages 3–5</span><b>{formatCount(response.demographics.metrics.age3to5)}</b></div>
                  <div className="demographicCard"><span>Ages 6–11</span><b>{formatCount(response.demographics.metrics.age6to11)}</b></div>
                  <div className="demographicCard"><span>Ages 12–17</span><b>{formatCount(response.demographics.metrics.age12to17)}</b></div>
                  <p className="demographicNote" role="note">{response.demographics.metrics.ageCohortNote ?? "Population age 2 and age 18 not available from this grouped source. No exact 2–18 total inferred."}</p>
                </div>
              )}

              <article className="territoryInsight">
                <div className="scoreOrb territoryScore"><strong>{reliability?.displayScore ?? "—"}</strong><span>{response.engine ?? engine}</span></div>
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

          {engine === "client" && Boolean(response?.communityNetworks?.length) && (
            <details className="sourceDisclosure">
              <summary>
                <span>Local family-resource ecosystem</span>
                <span>{response?.communityNetworks?.length ?? 0} public organizations · research only</span>
              </summary>
              <div className="sourceRail">
                <p>These organizations appear in Colorado&apos;s official child-care listings. They are NOT client leads, confirmed ABA referral relationships, or partner opportunities. No family or personal health information was collected.</p>
                {response?.communityNetworks?.slice(0,12).map((resource,index)=>(
                  <div className="sourceItem" key={resource.sourceId+resource.title+index}>
                    <i className="sourceDot complete" />
                    <div><b>{resource.title}</b><span>{resource.snippet}</span>
                      <a className="underline underline-offset-2" href={resource.url} target="_blank" rel="noopener noreferrer">Verify official listing ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {response?.publicSignals && (
            <details className="sourceDisclosure">
              <summary>
                <span>180 public signal hypotheses + 60 cross-checks</span>
                <span>{response.publicSignals.observations.length} supported · {response.publicSignals.supportedChecks}/60 linked</span>
              </summary>
              <div className="sourceRail">
                <p>Every clue is screened against distinct public sources. Unconfirmed reports remain leads for additional research and do not add points to the market score. Personal residential details are excluded.</p>
                {response.publicSignals.clues.slice(0, 20).map((clue) => (
                  <div className="sourceItem" key={clue.indicatorId}>
                    <i className={`sourceDot ${clue.corroborated ? "complete" : "unavailable"}`} />
                    <div>
                      <b>{clue.name} · {clue.corroborated ? "Corroborated" : "Needs independent evidence"}</b>
                      <span>{clue.sourceCount} distinct domains · {clue.geographySupported ? "Area verified" : "Location not corroborated"} · {clue.ageSupported ? "Target ages supported" : "Age not confirmed"} · {clue.sourceDomains.join(", ")}</span>
                    </div>
                  </div>
                ))}
                <details className="ruleDisclosure">
                  <summary>All 60 relationship checks</summary>
                  <div className="ruleList">
                    {response.publicSignals.crossChecks.map((check) => (
                      <div className="ruleRow" key={check.id}>
                        <span className={`ruleBadge ${check.status === "supported" ? "PASS" : check.status === "partial" ? "REVIEW" : "INFO"}`}>
                          {check.status}
                        </span>
                        <div className="ruleCopy"><b>{check.title}</b><p>{check.sourceCount} public source domains considered</p></div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </details>
          )}

          {response?.dataJoins && (
            <CountyJoinsPanel dataJoins={response.dataJoins} onUseCounty={(county) => setLocation(county + ", " + targetState)} />
          )}

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

          {historyResult && (
            <p className={historyResult === "saved" ? "statusStrip" : "warningCard"} role="status">
              {historyResult === "saved"
                ? "Research summary saved on this device. Compare it in Territories or review next steps in Intelligence."
                : "Research completed, but device history could not be saved. Check available storage; server persistence may still be available."}
            </p>
          )}
          <div className="resultSummary">
            <div><strong>{leads.length}</strong> {engine === "client" ? "public market sources (not family leads)" : "professional leads / signals"} <span>·</span> {response?.screened ?? 0} records screened</div>
            {response?.territory && <div className="territoryPill"><span>{response.territory.location}</span><b>{reliability?.displayScore == null ? "Insufficient evidence" : (reliability.displayScore + "/100 · " + response.territory.label)}</b></div>}
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
                      {engine === "client" && response?.youthQualifications?.[lead.id] && (
                          <span>{response.youthQualifications[lead.id].organizationRole.replaceAll("_", " ")} · {response.youthQualifications[lead.id].ageStatus} age fit</span>
                        )}
                        <span>{lead.evidence.length} evidence</span>
                      <span>{lead.confidence}% confidence</span>
                      <span>{lead.emails.length + lead.phones.length} contacts</span>
                      {lead.signals.slice(0, 2).map((signal) => <span key={signal}>{signal}</span>)}
                    </div>
                    <div className="counterpartyLine">{lead.reasons.slice(0, 2).join(" · ")}</div>
                  </div>
                  <ChevronRight size={18} className="chevron" aria-hidden="true" />
                </button>
                {engine !== "client" && canSaveToCrm(lead) ? (
                  <button type="button" className="saveLeadButton" onClick={() => saveLead(lead)}>
                    {savedIds.has(lead.id) ? <><Check size={14} /> Saved</> : <><Save size={14} /> CRM</>}
                  </button>
                ) : <span className="saveLeadButton">{engine === "client" ? "Market research" : "Signal"}</span>}
              </article>
            ))}
          </div>

          {!running && response?.ok && leads.length === 0 && (
            <div className="emptyDark">No qualified public leads were returned. The engine does not insert demo leads or infer private family health information.</div>
          )}
        </section>
      )}

      {selected && <LeadDossier marketOnly={engine === "client"} lead={selected} youthFit={response?.youthQualifications?.[selected.id]} reputation={response?.providerReputation?.[selected.id]} onClose={() => setSelected(null)} onSave={() => saveLead(selected)} saved={savedIds.has(selected.id)} />}
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

function LeadDossier({ lead, reputation, youthFit, onClose, onSave, saved, marketOnly }: { lead: ResolvedLead; marketOnly: boolean; reputation?: NonNullable<SearchResponse["providerReputation"]>[string]; youthFit?: YouthLeadQualification; onClose: () => void; onSave: () => void; saved: boolean }) {
  const evidenceGraph = buildLeadEvidenceGraph(lead);
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
          <div><b>{marketOnly ? "Why this public market source was found" : "Why this reached the lead feed"}</b><p>{lead.reasons.join(" · ")}</p></div>
        </div>

        <div className="statusStrip">
          <span className="statusChip"><Globe2 size={12} /> {lead.evidence.length} evidence</span>
          <span className="statusChip"><Users size={12} /> {lead.emails.length + lead.phones.length} contacts</span>
          <span className="statusChip"><Database size={12} /> {lead.domain || "domain unresolved"}</span>
        </div>

        {youthFit && (
          <section className="dossierSection" aria-label="Youth program and referral qualification">
            <h3>Age & referral qualification</h3>
            <div className="factCard">
              <div><span>Target</span><b>Ages {youthFit.targetBand}</b></div>
              <div><span>Age evidence</span><b>{youthFit.ageStatus.replaceAll("_", " ")}</b></div>
              <div><span>Organization</span><b>{youthFit.organizationRole.replaceAll("_", " ")}</b></div>
              <div><span>Age-published sources</span><b>{youthFit.supportingPublishers}</b></div>
            </div>
            <p>{youthFit.documentedAgeRanges.length
              ? "Published program age ranges: " + youthFit.documentedAgeRanges.map(({min,max}) => min + "–" + max).join(", ")
              : "No exact program age range independently documented. A school or preschool label is only a research clue."}</p>
            <p>Research candidate only until organizational referral suitability is confirmed. No individual children or households are profiled.</p>
          </section>
        )}

        <section className="dossierSection" aria-label="Independent evidence corroboration">
          <h3>Independent evidence review</h3>
          <div className="factCard">
            <div><span>Independent publishers</span><b>{evidenceGraph.publishers}</b></div>
            <div><span>Official/government</span><b>{evidenceGraph.governmentSources}</b></div>
            <div><span>Confirmed claims</span><b>{evidenceGraph.claims.filter((item) => item.supported).length}</b></div>
            <div><span>Evidence status</span><b>{evidenceGraph.posture.replaceAll("_", " ")}</b></div>
          </div>
          <p>{evidenceGraph.explanation}</p>
          {evidenceGraph.observedAt && (
            <p>Last collected {evidenceGraph.observedAt.slice(0, 10)}. Collection date is not the source publication date.</p>
          )}
          {evidenceGraph.contradictions.length > 0 && (
            <div className="unknownCard">
              <b>Conflicts requiring manual verification</b>
              {evidenceGraph.contradictions.map((conflict) => <p key={conflict}>{conflict}</p>)}
            </div>
          )}
          {evidenceGraph.claims.length > 0 && (
            <div className="stackList">
              {evidenceGraph.claims.map((item) => (
                <div className="stackRow" key={item.claim}>
                  <div>
                    <b>{item.claim.replaceAll("_", " ")} · {item.supported ? "Independent confirmation" : "Needs confirmation"}</b>
                    <span>{item.sourceCount} publisher{item.sourceCount === 1 ? "" : "s"} · {item.sourceDomains.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {reputation && (
          <section className="dossierSection" aria-label="Public competitor reputation sources">
            <h3>Public reputation / competitor reviews</h3>
            <p>{reputation.reviews.length
              ? reputation.reviews.length + " review or public press links found across " + reputation.distinctPublishers + " source type(s). None has been treated as independently verified."
              : "No review-source links verified for this organization. An empty result is not a positive or negative rating."}</p>
            <div className="stackList">
              {reputation.reviews.map((review) => (
                <a className="stackRow evidenceRow" href={review.url} target="_blank" rel="noopener noreferrer" key={review.url}>
                  <div>
                    <b>{review.publisher} · Open original source</b>
                    <span>{review.access === "link_only" ? "Direct verification only; reviews not scraped" : "Public media context; not independently verified"}</span>
                  </div>
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
            {reputation.independentThemes && (
              <>
                <h3>Cross-publisher reputation themes</h3>
                <p>{reputation.independentThemes.status === "corroborated"
                  ? "Some organization-level themes appear in multiple independent public reports. These are research findings, not clinical service-quality determinations."
                  : "No independently verified reputation pattern established. Single-source mentions are research leads, not market conclusions."}</p>
                <div className="stackList">
                  {reputation.independentThemes.publicThemes.map((theme) => (
                    <div className="stackRow" key={theme.theme}>
                      <div>
                        <b>{theme.theme.replaceAll("_"," ")} · {theme.independentlyCorroborated ? "Cross-referenced" : "Unconfirmed"}</b>
                        <span>{theme.publishers} independent public publisher{theme.publishers===1?"":"s"} · {theme.sentiment} report · {theme.sources.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <h3>Open Google / Yelp review search</h3>
                <p>External search links only. Platform ratings and individual review text are not scraped or stored.</p>
                <div className="stackList">
                  {reputation.independentThemes.reviewLinks.map((item) => (
                    <a className="stackRow evidenceRow" href={item.url} key={item.platform} target="_blank" rel="noopener noreferrer">
                      <div><b>{item.platform}</b><span>{item.source==="indexed_business_page"?"Indexed organization page · verify directly":"Search by organization and locality · verify the business match"}</span></div>
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </>
            )}
            <p>Reviewer identities, children, medical details and individual experiences are never added to CRM leads. Cross-check service claims with separate public sources.</p>
          </section>
        )}

        <section className="dossierSection">
          <div className="sectionTitleRow">
            <h3>{marketOnly ? "Public organization information" : "Public contact & qualification"}</h3>
            {!marketOnly && canSaveToCrm(lead) ? (
              <button type="button" className="miniPrimary" onClick={onSave}>{saved ? <><Check size={14}/> Saved</> : <><Save size={14}/> Save to CRM</>}</button>
            ) : <span className="statusChip">{marketOnly ? "Market research, not a client inquiry" : "Territory signal only"}</span>}
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

