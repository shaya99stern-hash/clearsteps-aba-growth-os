"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, CircleAlert, ClipboardList, Lightbulb, Plus, Search } from "lucide-react";
import {
  getServerCrmLeads, loadCrmLeads, subscribeCrmLeads, syncDurableCrmLeads,
} from "@/lib/crm/local-store";
import {
  getServerTasks, loadTasks, subscribeTasks, syncDurableTasks, createTask,
} from "@/lib/tasks/local-store";
import {
  getServerScoutRuns, loadScoutRuns, subscribeScoutRuns,
} from "@/lib/intelligence/scout-history";
import { buildOperatorQueue, operatorSummary } from "@/lib/intelligence/operator-insights";
import styles from "./DecisionCenter.module.css";

const REPORT_TIME = Date.now();

export function IntelligenceHub() {
  const runs = useSyncExternalStore(subscribeScoutRuns, loadScoutRuns, getServerScoutRuns);
  const leads = useSyncExternalStore(subscribeCrmLeads, loadCrmLeads, getServerCrmLeads);
  const tasks = useSyncExternalStore(subscribeTasks, loadTasks, getServerTasks);
  const [created, setCreated] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void syncDurableCrmLeads();
    void syncDurableTasks();
  }, []);
  const summary = useMemo(() => operatorSummary(runs, leads, tasks, REPORT_TIME), [runs, leads, tasks]);
  const queue = useMemo(() => buildOperatorQueue(runs, leads, tasks, REPORT_TIME), [runs, leads, tasks]);

  function makeFollowUp(id: string, leadId: string, leadKind: string, title: string, detail: string) {
    try {
      createTask({
        title: "Verify: " + title.replace(/^Review /, ""),
        description: detail + " Do not send outreach until source, consent and relevant credentials are manually reviewed.",
        priority: "high",
        entityId: leadId,
        entityType: leadKind,
      });
      setCreated((previous) => [...previous, id]);
      setMessage("Verification task added and linked to this CRM record.");
    } catch {
      setMessage("Could not create task. Review available browser storage and try again.");
    }
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.intro}>
        <div>
          <span className={styles.kicker}>Operating intelligence</span>
          <h2>What deserves attention next.</h2>
          <p>One decision queue generated from actual Scout research, CRM records and unfinished tasks. No fabricated opportunities or automated contact.</p>
        </div>
        <Link href="/" className={styles.primaryAction}><Search size={15} /> New research <ArrowUpRight size={15} /></Link>
      </section>
      <div className={styles.stats}>
        <div className={styles.metric}><span>Overdue tasks</span><strong>{summary.overdue}</strong><small>{summary.unfinished} unfinished total</small></div>
        <div className={styles.metric}><span>Referral CRM</span><strong>{summary.referralLeads}</strong><small>saved organizational opportunities</small></div>
        <div className={styles.metric}><span>Talent CRM</span><strong>{summary.talentLeads}</strong><small>saved professional opportunities</small></div>
        <div className={styles.metric}><span>Markets researched</span><strong>{summary.savedTerritories}</strong><small>{summary.evidenceToReview} need newer/stronger evidence</small></div>
      </div>
      <section className={styles.queuePanel}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>Prioritized from your workspace</span><h3>Decision queue</h3></div><span>{queue.length} items</span></div>
        {message && <p className={styles.confirmation} role="status">{message}</p>}
        {queue.length === 0 ? (
          <div className={styles.empty}>
            <Lightbulb size={28} />
            <h3>Nothing to prioritize yet.</h3>
            <p>Run Scout, review sourced leads, save appropriate organizations or candidates to their CRM, and add tasks. Qualified work will surface here automatically.</p>
            <Link href="/" className={styles.primaryAction}>Start in Scout <ArrowUpRight size={15} /></Link>
          </div>
        ) : (
          <div className={styles.queueList}>
            {queue.map((action) => (
              <article className={styles.queueItem} key={action.id}>
                <div className={styles.queueIcon}>
                  {action.kind === "overdue" ? <CircleAlert size={19} /> : action.kind === "crm" ? <ClipboardList size={19} /> : <Lightbulb size={19} />}
                </div>
                <div className={styles.queueCopy}>
                  <span className={styles.kicker}>{action.kind === "overdue" ? "Overdue task" : action.kind === "crm" ? "Evidence-backed CRM lead" : "Market intelligence"}</span>
                  <h4>{action.title}</h4>
                  <p>{action.detail}</p>
                </div>
                <div className={styles.queueActions}>
                  <Link className={styles.textAction} href={action.href}>Open <ArrowUpRight size={15} /></Link>
                  {action.kind === "crm" && action.leadId && action.leadKind && (
                    <button
                      className={styles.secondaryAction}
                      type="button"
                      disabled={created.includes(action.id)}
                      onClick={() => makeFollowUp(action.id, action.leadId as string, action.leadKind as string, action.title, action.detail)}
                    >
                      {created.includes(action.id) ? <><Check size={14} /> Task created</> : <><Plus size={14} /> Verify task</>}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <div className={styles.footerActions}>
        <Link href="/territories">Compare markets <ArrowUpRight size={14} /></Link>
        <Link href="/pipeline">Referral pipeline <ArrowUpRight size={14} /></Link>
        <Link href="/talent">Recruiting pipeline <ArrowUpRight size={14} /></Link>
        <Link href="/tasks">Task board <ArrowUpRight size={14} /></Link>
      </div>
      <p className={styles.disclaimer}>Recommendations organize public evidence for human review. High scores do not prove licensure, payer eligibility, suitability, or permission to contact. Scout history is device-local; CRM and tasks also sync to PostgreSQL where configured.</p>
    </div>
  );
}
