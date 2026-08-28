"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Columns3, ExternalLink, List, Mail, Phone, Search, X } from "lucide-react";
import {
  getServerCrmLeads,
  loadCrmLeads,
  subscribeCrmLeads,
  syncDurableCrmLeads,
  updateCrmStage,
  type PipelineStage,
  type SavedCrmLead,
  type TalentStage,
} from "@/lib/crm/local-store";
import { crmStageProgress, filterCrmWorkspace, summarizeCrmWorkspace } from "@/lib/crm/workspace";

const REFERRAL_STAGES: PipelineStage[] = ["Discovered", "Researched", "Qualified", "Contact Ready", "Outreach", "Engaged", "Referral Partner", "Referral Received"];
const TALENT_STAGES: TalentStage[] = ["Discovered", "Verified", "Contacted", "Replied", "Screen", "Interview", "Credentialing", "Hired"];
const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CrmPipeline({ mode }: { mode: "referral" | "talent" }) {
  const leads = useSyncExternalStore(subscribeCrmLeads, loadCrmLeads, getServerCrmLeads);
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const filtered = useMemo(() => filterCrmWorkspace(leads, mode, query), [leads, mode, query]);
  const summary = useMemo(() => summarizeCrmWorkspace(leads, mode), [leads, mode]);
  const selected = useMemo(() => leads.find((lead) => lead.id === selectedId && lead.pipeline === mode) ?? null, [leads, mode, selectedId]);
  const stages: Array<PipelineStage | TalentStage> = mode === "referral" ? REFERRAL_STAGES : TALENT_STAGES;
  const metrics = mode === "referral"
    ? [["Records", summary.total], ["Qualified+", summary.ready], ["Engaged+", summary.active], ["Referrals", summary.won]]
    : [["Candidates", summary.total], ["Verified+", summary.ready], ["Interview+", summary.active], ["Hires", summary.won]];

  useEffect(() => {
    void syncDurableCrmLeads();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const dialog = drawerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const initialFocus = dialog?.querySelector<HTMLElement>("[data-crm-initial-focus]") ?? dialog;
    requestAnimationFrame(() => initialFocus?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const opener = openerRef.current;
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, [selectedId]);

  function advance(lead: SavedCrmLead) {
    const index = stages.indexOf(lead.stage);
    if (index < 0 || index >= stages.length - 1) return;
    updateCrmStage(lead.id, stages[index + 1]);
  }

  function openDetails(id: string, trigger: HTMLButtonElement) {
    openerRef.current = trigger;
    setSelectedId(id);
  }

  function closeDetails() {
    setSelectedId(null);
  }

  return (
    <div className="crmWorkspace">
      <section className="crmKpiStrip" aria-label={`${mode} pipeline metrics`}>
        {metrics.map(([label, value]) => (
          <div className="crmKpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <div className="crmToolbar">
        <div className="crmViewTabs" aria-label="CRM view">
          <button type="button" className={view === "board" ? "active" : ""} onClick={() => setView("board")} aria-pressed={view === "board"}>
            <Columns3 size={14} aria-hidden="true" /> Board
          </button>
          <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-pressed={view === "list"}>
            <List size={14} aria-hidden="true" /> List
          </button>
        </div>
        <label className="crmSearchField">
          <Search size={14} aria-hidden="true" />
          <span className="sr-only">Search CRM records</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, stage, location, contact…" />
        </label>
        <span className="crmResultCount">{filtered.length} shown</span>
      </div>

      {view === "board" ? (
        <div className="crmBoard">
          <div className="boardScroller">
            {stages.map((stage) => {
              const stageLeads = filtered.filter((lead) => lead.stage === stage);
              return (
                <section className="boardColumn" key={stage}>
                  <header><span>{stage}</span><b>{stageLeads.length}</b></header>
                  <div className="boardCards">
                    {stageLeads.map((lead) => (
                      <article className="crmCard" key={lead.id}>
                        <button type="button" className="crmCardOpen" onClick={(event) => openDetails(lead.id, event.currentTarget)} aria-label={`Open ${lead.name} details`}>
                          <div className="crmCardTopline">
                            <div className="crmScore">{lead.score}</div>
                            <span>{lead.confidence}% conf.</span>
                          </div>
                          <h3>{lead.name}</h3>
                          <p>{lead.location || lead.domain || lead.kind}</p>
                          <div className="crmMeta"><span>{lead.evidence.length} sources</span><span>{lead.emails.length + lead.phones.length} contacts</span></div>
                        </button>
                        <div className="crmActions">
                          {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" aria-label={`Open public source for ${lead.name}`}><ExternalLink size={14} /></a> : <span />}
                          <button type="button" onClick={() => advance(lead)} disabled={stage === stages[stages.length - 1]}>
                            <ArrowRight size={14} aria-hidden="true" /> Advance
                          </button>
                        </div>
                      </article>
                    ))}
                    {stageLeads.length === 0 && <div className="columnEmpty">No records</div>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="crmListShell">
          <table className="crmTable">
            <thead>
              <tr><th>Record</th><th>Stage</th><th>Score</th><th>Contact</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td><button type="button" className="crmNameButton" onClick={(event) => openDetails(lead.id, event.currentTarget)}><strong>{lead.name}</strong><span>{lead.location || lead.domain || lead.kind}</span></button></td>
                  <td><span className="crmStagePill">{lead.stage}</span></td>
                  <td><b className="crmListScore">{lead.score}</b></td>
                  <td><span className="crmContactValue">{lead.emails[0] || lead.phones[0] || "—"}</span></td>
                  <td>{dateFormatter.format(new Date(lead.updatedAt))}</td>
                  <td><button type="button" className="crmAdvanceIcon" onClick={() => advance(lead)} disabled={lead.stage === stages[stages.length - 1]} aria-label={`Advance ${lead.name}`}><ArrowRight size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="crmListEmpty">No CRM records match this view.</div>}
        </div>
      )}

      {selected && (
        <div className="crmDrawerBackdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDetails(); }}>
          <aside ref={drawerRef} tabIndex={-1} className="crmDrawer" role="dialog" aria-modal="true" aria-labelledby="crm-drawer-title">
            <header className="crmDrawerHeader">
              <div>
                <span className="eyebrow">{selected.pipeline === "referral" ? "Referral relationship" : "Talent relationship"}</span>
                <h2 id="crm-drawer-title">{selected.name}</h2>
                <p>{selected.location || selected.domain || selected.kind}</p>
              </div>
              <button type="button" className="iconButton" data-crm-initial-focus onClick={closeDetails} aria-label="Close CRM details"><X size={17} /></button>
            </header>

            <div className="crmDrawerScore">
              <div><strong>{selected.score}</strong><span>lead score</span></div>
              <div className="crmProgressBlock">
                <div><span>{selected.stage}</span><b>{crmStageProgress(selected).percent}%</b></div>
                <div className="crmProgressTrack"><i style={{ width: `${crmStageProgress(selected).percent}%` }} /></div>
                <p>{selected.confidence}% evidence confidence · {selected.evidence.length} sources</p>
              </div>
            </div>

            <section className="crmDrawerSection">
              <h3>Contact</h3>
              <div className="crmContactGrid">
                <div><Mail size={14} aria-hidden="true" /><span>{selected.emails[0] || "No public email found"}</span></div>
                <div><Phone size={14} aria-hidden="true" /><span>{selected.phones[0] || "No public phone found"}</span></div>
              </div>
            </section>

            <section className="crmDrawerSection">
              <h3>Why this record matters</h3>
              {selected.reasons.length ? <div className="crmReasonList">{selected.reasons.slice(0, 5).map((reason) => <p key={reason}>{reason}</p>)}</div> : <p className="crmMuted">No scored reasons recorded yet.</p>}
            </section>

            <section className="crmDrawerSection">
              <h3>Evidence</h3>
              {selected.evidence.length ? (
                <div className="crmEvidenceList">
                  {selected.evidence.slice(0, 6).map((evidence) => (
                    <a key={evidence.id} href={evidence.url} target="_blank" rel="noreferrer">
                      <span>{evidence.sourceId}</span>
                      <strong>{evidence.title}</strong>
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : <p className="crmMuted">No source evidence attached.</p>}
            </section>

            {selected.unknowns.length > 0 && (
              <section className="crmDrawerSection">
                <h3>Open research</h3>
                <div className="crmUnknownList">{selected.unknowns.slice(0, 5).map((unknown) => <p key={unknown}>{unknown}</p>)}</div>
              </section>
            )}

            <footer className="crmDrawerFooter">
              {selected.website && <a href={selected.website} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Public source</a>}
              <button type="button" onClick={() => advance(selected)} disabled={selected.stage === stages[stages.length - 1]}><ArrowRight size={14} /> Advance stage</button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
