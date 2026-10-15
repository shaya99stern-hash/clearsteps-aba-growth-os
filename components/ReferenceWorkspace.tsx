"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, ChartNoAxesCombined, Check, ChevronRight, Inbox, KanbanSquare, ListTodo, MapPin, Plus, Search, Send, Users, type LucideIcon } from "lucide-react";
import { getServerCrmLeads, loadCrmLeads, subscribeCrmLeads, syncDurableCrmLeads } from "@/lib/crm/local-store";
import { getServerTasks, loadTasks, subscribeTasks, syncDurableTasks, updateTaskStatus, type SavedTask } from "@/lib/tasks/local-store";
import { getServerScoutRuns, loadScoutRuns, subscribeScoutRuns, type ScoutEngine, type ScoutState } from "@/lib/intelligence/scout-history";

function useWorkspace() {
  const leads = useSyncExternalStore(subscribeCrmLeads, loadCrmLeads, getServerCrmLeads);
  const tasks = useSyncExternalStore(subscribeTasks, loadTasks, getServerTasks);
  const runs = useSyncExternalStore(subscribeScoutRuns, loadScoutRuns, getServerScoutRuns);
  const [now] = useState(() => new Date());
  useEffect(() => { void syncDurableCrmLeads(); void syncDurableTasks(); }, []);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const due = tasks.filter((task) => task.status !== "done" && task.dueAt && Date.parse(task.dueAt) <= end.getTime());
  return { leads, tasks, runs, due };
}

function Tile({ href, icon: Icon, title, detail }: { href: string; icon: LucideIcon; title: string; detail: string }) {
  return <Link href={href} className="referenceTile"><Icon size={20} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={14} aria-hidden="true" /></Link>;
}
function RowLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
  return <Link href={href} className="referenceRowLink"><Icon size={16} aria-hidden="true" /><span>{children}</span><ChevronRight size={16} aria-hidden="true" /></Link>;
}
function TaskRows({ tasks }: { tasks: SavedTask[] }) {
  const [error, setError] = useState("");
  return <>
    {error && <p role="alert" className="referenceEmpty">{error}</p>}
    {tasks.length ? <ul className="referenceTasks">{tasks.map((task) => <li key={task.id}>
      <button type="button" className="referenceComplete" aria-label={`Complete ${task.title}`} onClick={() => {
        try { updateTaskStatus(task.id, "done"); setError(""); }
        catch { setError("Could not save this change. Please allow browser storage and try again."); }
      }}><span><Check size={12} aria-hidden="true" /></span></button>
      <Link href="/tasks" className="referenceTaskText"><strong>{task.title}</strong><small>{task.description || "Open task details"}</small></Link>
      <span className="referenceTaskDue">{task.dueAt ? new Date(task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date"}</span>
    </li>)}</ul> : <div className="referenceEmpty"><Check size={18} aria-hidden="true" /><span>You’re all caught up. <Link href="/tasks">View all tasks</Link></span></div>}
  </>;
}

export function WorkspaceHome() {
  const { due } = useWorkspace();
  return <div className="referencePage referenceHome">
    <header className="referenceHeading"><h1>Hi, Shaya</h1></header>
    <nav aria-label="Workspaces" className="referenceWorkspaces">
      <Tile href="/leads" icon={ChartNoAxesCombined} title="Leads" detail="Find referral sources & research opportunities" />
      <Tile href="/crm" icon={Users} title="Clear Steps Database" detail="Organizations, contacts & follow-ups" />
    </nav>
    <section className="referenceHomeToday" aria-label="Today"><h2 className="referenceLabel">Today</h2><RowLink href="/today" icon={ListTodo}>{due.length ? `${due.length} ${due.length === 1 ? "item needs" : "items need"} your attention` : "You’re all caught up. View your day"}</RowLink></section>
  </div>;
}

export function WorkspaceCrm() {
  const { leads, due } = useWorkspace();
  return <div className="referencePage">
    <header className="referenceHeading referenceHeadingRow"><div><h1>CRM</h1><p>Your relationships, in one place.</p></div><Link href="/leads" className="referencePrimary"><Plus size={16} aria-hidden="true" />Add organization</Link></header>
    <nav aria-label="CRM records" className="referenceRecords">
      <Tile href="/organizations" icon={Building2} title="Organizations" detail="Referral sources, practices & partners" />
      <Tile href="/contacts" icon={Users} title="Contacts" detail="People & conversations" />
      <Tile href="/pipeline" icon={KanbanSquare} title="Pipeline" detail="Opportunities & stages" />
    </nav>
    <div className="referenceSummary" aria-label="CRM summary">
      <Link href="/pipeline"><strong>{leads.filter((lead) => lead.pipeline === "referral").length}</strong><span>In pipeline</span></Link>
      <Link href="/today"><strong>{due.length}</strong><span>Tasks due</span></Link>
      <Link href="/talent"><strong>{leads.filter((lead) => lead.pipeline === "talent").length}</strong><span>Talent</span></Link>
    </div>
    <section className="referencePanel" aria-label="Today"><div className="referencePanelHeading"><h2>Today</h2><Link href="/today">View day <ArrowRight size={14} aria-hidden="true" /></Link></div><TaskRows tasks={due.slice(0, 5)} /></section>
    <nav aria-label="CRM communication" className="referenceCommunication"><RowLink href="/outreach" icon={Inbox}>Outreach</RowLink><RowLink href="/follow-ups" icon={Send}>Follow-ups</RowLink></nav>
    <Link className="referenceInsightLink" href="/intelligence"><span>Activity & insights</span><ChevronRight size={14} aria-hidden="true" /></Link>
    <Link className="referenceEmailLink" href="/settings">Workspace settings <ArrowRight size={15} aria-hidden="true" /></Link>
  </div>;
}

export function WorkspaceToday() {
  const { leads, due, runs, tasks } = useWorkspace();
  const steps = [{ title: "Find leads", href: "/leads", done: runs.length > 0, detail: "Research your territory" }, { title: "Save an organization", href: "/crm", done: leads.length > 0, detail: "Build your relationships" }, { title: "Plan your follow-ups", href: "/tasks", done: tasks.length > 0, detail: "Keep the next step in sight." }];
  return <div className="referencePage referenceNarrow">
    <header className="referenceHeading"><Link className="referenceBack" href="/"><ArrowLeft size={16} aria-hidden="true" />Home</Link><h1>Today</h1><p>Your next steps, all in one place.</p></header>
    <section className="referenceOnboarding" aria-label="Get started"><div className="referenceOnboardingHeading"><div><h2>Get Clear Steps ready</h2><p>{steps.filter((step) => step.done).length} of 3 done</p></div><div className="referenceProgress" aria-hidden="true">{steps.map((step) => <span key={step.title} className={step.done ? "done" : ""} />)}</div></div><div className="referenceSteps">{steps.map((step, index) => <Link href={step.href} key={step.title}><span className={step.done ? "referenceStepIcon done" : "referenceStepIcon"}>{step.done ? <Check size={16} /> : <ListTodo size={16} />}</span><span><strong><b>{index + 1}</b>{step.title}</strong><small>{step.done ? "Done" : step.detail}</small></span></Link>)}</div></section>
    <section className="referenceNumbers" aria-label="Key numbers">{[
      { label: "In pipeline", value: leads.length, href: "/pipeline" },
      { label: "Qualified", value: leads.filter((lead) => lead.stage === "Qualified").length, href: "/pipeline" },
      { label: "Research runs", value: runs.length, href: "/research-runs" },
      { label: "Tasks due", value: due.length, href: "/tasks" },
    ].map((number) => <Link key={number.label} href={number.href}><span>{number.label}</span><strong>{number.value}</strong></Link>)}</section>
    <section className="referenceSection" aria-label="Due today"><h2 className="referenceLabel">Due today · {due.length}</h2><div className="referencePanel"><TaskRows tasks={due} /></div></section>
    <section className="referenceSection" aria-label="Leads to review"><h2 className="referenceLabel">Leads to review</h2><div className="referencePanel">{leads.length ? leads.slice(0, 3).map((lead) => <Link key={lead.id} href={`${lead.pipeline === "talent" ? "/talent" : "/pipeline"}?search=${encodeURIComponent(lead.name)}`} className="referenceLeadRow"><span className="referenceScore">{lead.score}</span><span><strong>{lead.name}</strong><small>{lead.location}</small><p>{lead.reasons?.[0] || "Review evidence and confirm the next step."}</p></span><ChevronRight size={16} aria-hidden="true" /></Link>) : <div className="referenceEmpty">No saved leads yet. <Link href="/leads">Find leads <ArrowRight size={14} /></Link></div>}</div></section>
    <section className="referenceSection" aria-label="Contacts to review"><h2 className="referenceLabel">Contacts to review</h2><p className="referenceSectionHint">Review contact details before planning your next conversation.</p><div className="referencePanel"><RowLink href="/contacts" icon={Users}>Open your contacts</RowLink></div></section>
    <Link href="/intelligence" className="referenceActivity"><ChartNoAxesCombined size={18} aria-hidden="true" /><span><strong>Activity & insights</strong><small>Recent activity, outreach and pipeline by stage</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
  </div>;
}

export function WorkspaceLeads() {
  const router = useRouter();
  const runs = useSyncExternalStore(subscribeScoutRuns, loadScoutRuns, getServerScoutRuns);
  const [state, setState] = useState<ScoutState>("MO");
  const [engine, setEngine] = useState<ScoutEngine>("client");
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  return <div className="referencePage referenceNarrow">
    <header className="referenceHeading"><h1>Leads</h1><p>Find opportunities. Research the fit. Save to CRM.</p></header>
    <div className="referencePanel referenceLeadForm"><form onSubmit={(event) => {
      event.preventDefault();
      const focus = query.trim() || (engine === "client" ? "Pediatric practices and developmental evaluators that refer for autism" : `${engine.toUpperCase()} recruiting opportunities`);
      router.push(`/scout?${new URLSearchParams({ state, engine, location: location.trim(), query: focus })}`);
    }}>
      <fieldset><legend>Where are you looking?</legend><div className="referenceStateChips">{(["MO", "KS", "CO"] as const).map((item) => <button key={item} type="button" aria-pressed={state === item} onClick={() => setState(item)}>{item}</button>)}</div></fieldset>
      <div className="referenceField"><label htmlFor="leads-location">City or county</label><div className="referenceLocation"><MapPin size={16} aria-hidden="true" /><input id="leads-location" placeholder={state === "CO" ? "e.g. Denver, Jefferson County" : state === "KS" ? "e.g. Wichita, Johnson County" : "e.g. Kansas City, Jackson County"} value={location} maxLength={160} onChange={(event) => setLocation(event.target.value)} /></div><p>Leave blank to search the selected state.</p></div>
      <div className="referenceFormColumns"><div className="referenceField"><label htmlFor="leads-engine">Lead type</label><select id="leads-engine" value={engine} onChange={(event) => setEngine(event.target.value as ScoutEngine)}><option value="client">Referral sources</option><option value="rbt">RBTs</option><option value="bcba">BCBAs</option></select></div><div className="referenceField"><label htmlFor="leads-focus">Research focus</label><input id="leads-focus" value={query} maxLength={1000} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Pediatric practices" /></div></div>
      <details className="referenceFilters"><summary>More filters <ChevronRight size={14} aria-hidden="true" /></summary><p>Refine age focus and your research request in Scout before running your search.</p><Link href="/map">Explore territories on the map <ArrowRight size={14} /></Link></details>
      <button className="referencePrimary" type="submit"><ChartNoAxesCombined size={16} aria-hidden="true" />Find leads</button><p className="referenceFormHint">Review your search in Scout, then run your research.</p>
    </form></div>
    <section className="referenceSection" aria-label="Recent searches"><h2 className="referenceLabel">Recent searches</h2><div className="referenceRecentSearches">{runs.length ? runs.slice(0, 4).map((run) => <Link className="referenceRecentSearch" key={run.id} href={`/scout?${new URLSearchParams({ state: run.state, engine: run.engine, location: run.location, query: run.query })}`}><div><strong><Search size={16} aria-hidden="true" />{run.location || run.state} · {run.engine === "client" ? "Referral sources" : run.engine.toUpperCase()}</strong><small>{run.screened} screened · {run.qualified} results</small></div><span className="referenceBadge"><i />Completed</span><ArrowRight size={16} aria-hidden="true" /></Link>) : <div className="referenceEmpty referencePanel"><Search size={18} aria-hidden="true" /><span>Your completed searches will appear here.</span></div>}</div></section>
  </div>;
}
