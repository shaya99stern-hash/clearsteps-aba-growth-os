"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Database, Layers, LoaderCircle, ShieldAlert } from "lucide-react";
import shared from "./DecisionCenter.module.css";
import styles from "./CountyJoinBoard.module.css";

type JoinState = "MO" | "KS" | "CO";
type JoinTuple = readonly [string, number | null, number | null, number | null, string[]];
type CatalogEntry = { id: string; family: string; title: string; rationale: string; formula: string; unit: string; opportunity: string; programs: string[]; indicator: string | null };
type CountyRow = {
  fips: string; name: string; rank: number | null; rankedOf: number; score: number | null; confidence: number; coverage: number;
  computedJoins: number; agreement: number | null; children: number | null; lowSample: boolean;
  drivers: string[]; cautions: string[];
  familyScores: Array<{ family: string; title: string; score: number | null; computed: number; total: number }>;
  joins: JoinTuple[];
};
type RankingResponse = {
  ok: true; state: JoinState; capturedAt: string;
  totals: { counties: number; ranked: number; joins: number; crossProgramJoins: number };
  programs: Array<{ program: string; label: string; publisher: string; status: string; detail: string; vintage: string | null }>;
  integrityIssues: string[];
  families: Record<string, { title: string; summary: string }>;
  catalog: CatalogEntry[];
  counties: CountyRow[];
};

const STATE_NAMES: Record<JoinState, string> = { MO: "Missouri", KS: "Kansas", CO: "Colorado" };

function formatValue(value: number | null) {
  if (value === null) return "—";
  const abs = Math.abs(value);
  return abs < 1 ? value.toFixed(2) : abs < 100 ? value.toFixed(1) : Math.round(value).toLocaleString("en-US");
}

export function CountyJoinBoard() {
  const [state, setState] = useState<JoinState>("MO");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function rank(target: JoinState) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/intelligence/territory-joins?state=" + target, { cache: "no-store" });
      const payload = await response.json() as RankingResponse | { ok: false; error: string };
      if (!payload.ok) throw new Error(payload.error);
      setData(payload);
      setOpen(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "County ranking failed");
    } finally {
      setLoading(false);
    }
  }

  const catalog = new Map((data?.catalog ?? []).map((entry) => [entry.id, entry]));
  const counties = (data?.counties ?? []).filter((county) => county.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const visible = showAll || filter ? counties : counties.slice(0, 15);
  const completePrograms = data?.programs.filter((program) => program.status === "complete").length ?? 0;
  const applicablePrograms = data?.programs.filter((program) => program.status !== "not_applicable").length ?? 0;

  return (
    <section className={shared.queuePanel + " " + styles.board} aria-labelledby="county-joins-heading">
      <div className={shared.sectionHead}>
        <div>
          <span className={shared.kicker}>{data ? data.totals.joins : 90} cross-source data joins</span>
          <h3 id="county-joins-heading">Rank every county</h3>
        </div>
        <span>Census ACS · NPPES provider registry · OpenStreetMap · TIGER · HRSA shortage areas · state child-care licensing · SAIPE / SAHIE / CBP with a Census API key</span>
      </div>
      <p className={styles.lede}>
        Each join combines at least two separate public sources (for example, children with a disability per registered ABA organization, or
        licensed child-care slots per ABA organization), ranked as a percentile among the state&apos;s counties. No API key is required. Use it to choose where to run Scout
        and build referral relationships. These are area-level proxies, not confirmed waitlists, diagnoses or eligibility.
      </p>
      <div className={shared.filterBar}>
        <label className={shared.selectWrap}>
          <span>State</span>
          <select value={state} onChange={(event) => setState(event.target.value as JoinState)}>
            <option value="MO">Missouri</option><option value="KS">Kansas</option><option value="CO">Colorado</option>
          </select>
        </label>
        <button type="button" className={shared.primaryAction} onClick={() => rank(state)} disabled={loading}>
          {loading ? <LoaderCircle size={15} className={styles.spin} /> : <Layers size={15} />}
          {loading ? "Joining public data…" : data?.state === state ? "Refresh ranking" : "Rank " + STATE_NAMES[state] + " counties"}
        </button>
        {data && (
          <label className={shared.filterField}>
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find a county" aria-label="Filter counties" />
          </label>
        )}
      </div>

      {error && <p className={shared.caution} role="alert"><ShieldAlert size={14} /> {error}</p>}

      {data && (
        <>
          <div className={shared.stats}>
            <div className={shared.metric}><span>Counties ranked</span><strong>{data.totals.ranked}</strong><small>of {data.totals.counties} in {STATE_NAMES[data.state]}; at least half the joins required</small></div>
            <div className={shared.metric}><span>Data joins</span><strong>{data.totals.crossProgramJoins}</strong><small>each crosses two or more statistical programs</small></div>
            <div className={shared.metric}><span>Programs responding</span><strong>{completePrograms}/{applicablePrograms}</strong><small>unavailable programs leave their joins blank, never estimated</small></div>
            <div className={shared.metric}><span>Integrity drops</span><strong>{data.integrityIssues.length}</strong><small>county tables that failed consistency checks and were excluded</small></div>
          </div>
          <div className={styles.programs}>
            {data.programs.map((program) => (
              <span key={program.program} className={program.status === "complete" ? styles.ok : program.status === "not_applicable" ? styles.na : styles.bad} title={program.detail}>
                <Database size={11} /> {program.label}{program.vintage ? " · " + program.vintage : ""}{program.status !== "complete" ? " · " + (program.status === "not_applicable" ? "n/a" : "unavailable") : ""}
              </span>
            ))}
          </div>

          <ol className={styles.list}>
            {visible.map((county) => {
              const expanded = open === county.fips;
              const short = county.name.split(",")[0];
              const scoutHref = "/?state=" + data.state + "&engine=client&location=" + encodeURIComponent(short + ", " + data.state);
              return (
                <li key={county.fips} className={styles.row}>
                  <button type="button" className={styles.rowHead} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : county.fips)}>
                    <span className={styles.rank}>{county.rank ? "#" + county.rank : "—"}</span>
                    <span className={styles.name}>
                      <b>{short}</b>
                      <small>{county.children !== null ? county.children.toLocaleString("en-US") + " children · " : ""}{county.computedJoins}/{data.totals.joins} joins · confidence {county.confidence}%{county.lowSample ? " · small sample" : ""}</small>
                    </span>
                    <span className={styles.score}><strong>{county.score ?? "—"}</strong><small>{county.score === null ? "unranked" : "/100"}</small></span>
                    <ChevronDown size={16} className={expanded ? styles.chevOpen : styles.chev} aria-hidden="true" />
                  </button>
                  {county.drivers[0] && <p className={styles.driver}>{county.drivers[0]}</p>}
                  {expanded && (
                    <div className={styles.detail}>
                      <div className={styles.families}>
                        {county.familyScores.map((family) => (
                          <div key={family.family}>
                            <span>{family.title}</span><b>{family.score ?? "—"}</b>
                            <i><em style={{ width: (family.score ?? 0) + "%" }} /></i>
                            <small>{family.computed}/{family.total} joins</small>
                          </div>
                        ))}
                      </div>
                      {county.drivers.length > 0 && <ul className={styles.notes}>{county.drivers.map((text) => <li key={text}>{text}</li>)}</ul>}
                      {county.cautions.length > 0 && <ul className={styles.warnings}>{county.cautions.map((text) => <li key={text}>{text}</li>)}</ul>}
                      <table className={styles.table}>
                        <thead><tr><th>Join</th><th>Value</th><th title="Within-state percentile; validation joins show agreement 0–100">Pct</th></tr></thead>
                        <tbody>
                          {county.joins.map(([id, raw, percentile, agreement, missing]) => {
                            const entry = catalog.get(id);
                            const value = percentile ?? agreement;
                            return (
                              <tr key={id} title={entry ? entry.formula + "\n\n" + entry.rationale : id}>
                                <td><b>{id}</b> {entry?.title}<small>{entry?.programs.join(" × ")}</small></td>
                                <td>{value === null ? <span className={styles.missing}>{missing.length ? "missing " + missing.join(", ") : "insufficient data"}</span> : <>{formatValue(raw)} <small>{entry?.unit}</small></>}</td>
                                <td><span className={value === null ? styles.pctNone : value >= 70 ? styles.pctHigh : value >= 30 ? styles.pctMid : styles.pctLow}>{value ?? "—"}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <Link className={shared.textAction} href={scoutHref}>Run Scout for {short} <ArrowUpRight size={15} /></Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {!filter && counties.length > 15 && (
            <button type="button" className={shared.secondaryAction} onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show top 15" : "Show all " + counties.length + " counties"}
            </button>
          )}
          <p className={shared.disclaimer}>
            Captured {data.capturedAt.slice(0, 16).replace("T", " ")} UTC. Percentiles compare counties within {STATE_NAMES[data.state]} only.
            NAICS 621330 counts all non-physician mental-health practices, not only ABA providers. Aggregated public statistics only; no family, child or household records are used.
          </p>
        </>
      )}
    </section>
  );
}
