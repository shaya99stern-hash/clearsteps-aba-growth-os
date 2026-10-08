"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Database, MapPinned, Search, ShieldAlert } from "lucide-react";
import {
  evidencePosture, getServerScoutRuns, latestTerritoryRuns,
  loadScoutRuns, subscribeScoutRuns, type ScoutEngine, type ScoutState,
} from "@/lib/intelligence/scout-history";
import styles from "./DecisionCenter.module.css";

const REPORT_TIME = Date.now();

export function TerritoryBoard() {
  const runs = useSyncExternalStore(subscribeScoutRuns, loadScoutRuns, getServerScoutRuns);
  const [state, setState] = useState<"all" | ScoutState>("all");
  const [engine, setEngine] = useState<"all" | ScoutEngine>("all");
  const [filter, setFilter] = useState("");
  const latest = useMemo(() => latestTerritoryRuns(runs), [runs]);
  const visible = latest
    .filter((run) => state === "all" || run.state === state)
    .filter((run) => engine === "all" || run.engine === engine)
    .filter((run) => run.location.toLowerCase().includes(filter.trim().toLowerCase()))
    .sort((a, b) => b.score - a.score);
  const thin = latest.filter((run) => evidencePosture(run, REPORT_TIME) !== "review").length;

  return (
    <div className={styles.workspace}>
      <section className={styles.intro}>
        <div>
          <span className={styles.kicker}>Evidence-first market map</span>
          <h2>Territories worth understanding.</h2>
          <p>Compare completed Scout runs by market and engine. Ratings are research signals, not validated demand, licensing clearance or payer approval.</p>
        </div>
        <Link className={styles.primaryAction} href="/"><Search size={15} /> Run Scout <ArrowUpRight size={15} /></Link>
      </section>
      <div className={styles.stats}>
        <div className={styles.metric}><span>Researched markets</span><strong>{latest.length}</strong><small>unique market + engine combinations</small></div>
        <div className={styles.metric}><span>Scout runs</span><strong>{runs.length}</strong><small>latest 30 saved on this device</small></div>
        <div className={styles.metric}><span>Need further evidence</span><strong>{thin}</strong><small>thin coverage or older than 30 days</small></div>
      </div>
      <div className={styles.filterBar}>
        <label className={styles.filterField}><Search size={16} aria-hidden="true" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search city or region" aria-label="Filter territories" /></label>
        <label className={styles.selectWrap}><span>State</span><select value={state} onChange={(event) => setState(event.target.value as "all" | ScoutState)}><option value="all">MO + KS + CO</option><option value="MO">Missouri</option><option value="KS">Kansas</option><option value="CO">Colorado</option></select></label>
        <label className={styles.selectWrap}><span>Engine</span><select value={engine} onChange={(event) => setEngine(event.target.value as "all" | ScoutEngine)}><option value="all">All engines</option><option value="client">Clients</option><option value="rbt">RBT</option><option value="bcba">BCBA</option></select></label>
      </div>
      {latest.length === 0 ? (
        <section className={styles.empty}>
          <MapPinned size={28} aria-hidden="true" />
          <h3>Your first market starts in Scout.</h3>
          <p>Run a real Missouri, Kansas, or Colorado research scan. Its scores, evidence coverage, source status and warnings will appear here automatically—without entering the data twice.</p>
          <Link href="/" className={styles.primaryAction}>Research a market <ArrowUpRight size={15} /></Link>
        </section>
      ) : visible.length === 0 ? (
        <section className={styles.empty}><h3>No matching markets</h3><p>Change the filters to view the research already saved on this device.</p></section>
      ) : (
        <section className={styles.cards} aria-label="Saved territory comparisons">
          {visible.map((run) => {
            const posture = evidencePosture(run, REPORT_TIME);
            const href = "/?state=" + run.state + "&engine=" + run.engine + "&location=" + encodeURIComponent(run.location) + "&query=" + encodeURIComponent(run.query);
            return (
              <article className={styles.territoryCard} key={run.id}>
                <div className={styles.cardTop}>
                  <div><span className={styles.kicker}>{run.state} · {run.engine === "client" ? "Clients" : run.engine.toUpperCase()}</span><h3>{run.location}</h3></div>
                  <div className={styles.score}><strong>{run.label === "Insufficient Evidence" ? "—" : run.score}</strong><small>{run.label === "Insufficient Evidence" ? "unscored" : "/100"}</small></div>
                </div>
                <div className={styles.progressRow}>
                  <div><span>Confidence</span><b>{run.confidence}%</b><i><em style={{ width: run.confidence + "%" }} /></i></div>
                  <div><span>Model coverage</span><b>{run.coverage}%</b><i><em style={{ width: run.coverage + "%" }} /></i></div>
                </div>
                <div className={styles.metaLine}>
                  <span><Database size={13} /> {run.completedSources}/{run.sourceCount} sources</span>
                  <span>{run.qualified} qualified signals</span>
                  <span>{run.capturedAt.slice(0, 10)}</span>
                </div>
                <div className={posture === "review" ? styles.posture : styles.caution}>
                  {posture !== "review" && <ShieldAlert size={14} />}
                  {posture === "review" ? "Enough source coverage for manual review" : posture === "stale" ? "Older than 30 days — refresh before decisions" : "Thin evidence — investigate before acting"}
                </div>
                {run.reasoning[0] && <p className={styles.reason}>{run.reasoning[0]}</p>}
                <Link className={styles.textAction} href={href}>Re-run and investigate <ArrowUpRight size={15} /></Link>
              </article>
            );
          })}
        </section>
      )}
      <p className={styles.disclaimer}>Only saved area-level research summaries are shown. Client/patient profiles are not created. Research history here is stored on this device; database-backed research is handled separately by Scout.</p>
    </div>
  );
}
