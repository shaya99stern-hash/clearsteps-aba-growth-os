import type { ReactNode } from "react";
import { Activity, Database, Download, Globe2, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { getOperationalSourcesSnapshot } from "@/lib/intelligence/source-status";
import styles from "./sources.module.css";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const snapshot = await getOperationalSourcesSnapshot();

  return (
    <PageShell
      title="Sources"
      description="See what Clear Steps can actually search, verify, enrich, and monitor — with live runtime status instead of placeholder connectors."
    >
      <div className={styles.ops}>
        <section className={styles.stats} aria-label="Source mesh summary">
          <SourceStat icon={<ShieldCheck size={17} />} value={snapshot.counts.ready} label="ready" />
          <SourceStat icon={<Activity size={17} />} value={snapshot.counts.degraded} label="degraded" />
          <SourceStat icon={<Database size={17} />} value={snapshot.sources.length} label="source adapters" />
          <SourceStat icon={<Globe2 size={17} />} value={snapshot.counts.apiKeyFree} label="no paid key" />
        </section>

        <section className={styles.mesh}>
          {snapshot.sources.map((source) => (
            <article className={styles.card} key={source.id}>
              <div className={styles.top}>
                <div>
                  <div className={styles.nameRow}>
                    <span className={styles.health} data-health={source.runtimeHealth} />
                    <h2>{source.name}</h2>
                  </div>
                  <p>{source.description}</p>
                </div>
                <span className={styles.stateBadge}>{source.runtimeHealth}</span>
              </div>

              <div className={styles.policy}>
                {source.purposes.map((purpose) => <span key={purpose}>{purpose}</span>)}
              </div>

              <dl className={styles.facts}>
                <div><dt>Method</dt><dd>{source.method}</dd></div>
                <div><dt>Coverage</dt><dd>{source.coverage.join(" · ")}</dd></div>
                <div><dt>Paid key</dt><dd>{source.apiKeyRequired ? "required" : "not required"}</dd></div>
              </dl>

              <p className={styles.runtime}>{source.detail}</p>
            </article>
          ))}
        </section>

        <section className={styles.manifest}>
          <div className={styles.manifestIcon}><Download size={19} /></div>
          <div>
            <span className="eyebrow">CMS / NPPES provider index</span>
            <h2>Current download feed</h2>
            {snapshot.cms.monthly ? (
              <>
                <p>{snapshot.cms.monthly.label}</p>
                <div className={styles.manifestMeta}>
                  <span>{snapshot.cms.weeklyCount} weekly update file(s) discovered</span>
                  {snapshot.cms.fetchedAt && <span>checked {new Date(snapshot.cms.fetchedAt).toLocaleString()}</span>}
                </div>
              </>
            ) : (
              <p>{snapshot.cms.error ?? "CMS manifest is temporarily unavailable. The adapter remains configured."}</p>
            )}
          </div>
        </section>

        <p className={styles.checked}>Runtime snapshot checked {new Date(snapshot.checkedAt).toLocaleString()}.</p>
      </div>
    </PageShell>
  );
}

function SourceStat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <span>{icon}</span>
      <div><b>{value}</b><small>{label}</small></div>
    </div>
  );
}
