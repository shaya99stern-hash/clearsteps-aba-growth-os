import { Activity, Database, Download, Globe2, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { getOperationalSourcesSnapshot } from "@/lib/intelligence/source-status";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const snapshot = await getOperationalSourcesSnapshot();

  return (
    <PageShell
      title="Sources"
      description="See what Clear Steps can actually search, verify, enrich, and monitor — with live runtime status instead of placeholder connectors."
    >
      <div className="sourceOps">
        <section className="sourceStats" aria-label="Source mesh summary">
          <SourceStat icon={<ShieldCheck size={17} />} value={snapshot.counts.ready} label="ready" />
          <SourceStat icon={<Activity size={17} />} value={snapshot.counts.degraded} label="degraded" />
          <SourceStat icon={<Database size={17} />} value={snapshot.sources.length} label="source adapters" />
          <SourceStat icon={<Globe2 size={17} />} value={snapshot.counts.apiKeyFree} label="no paid key" />
        </section>

        <section className="sourceMesh">
          {snapshot.sources.map((source) => (
            <article className="sourceOpsCard" key={source.id}>
              <div className="sourceOpsTop">
                <div>
                  <div className="sourceOpsNameRow">
                    <span className={`sourceHealth ${source.runtimeHealth}`} />
                    <h2>{source.name}</h2>
                  </div>
                  <p>{source.description}</p>
                </div>
                <span className={`sourceStateBadge ${source.runtimeHealth}`}>{source.runtimeHealth}</span>
              </div>

              <div className="sourcePolicyRow">
                {source.purposes.map((purpose) => <span key={purpose}>{purpose}</span>)}
              </div>

              <dl className="sourceFacts">
                <div><dt>Method</dt><dd>{source.method}</dd></div>
                <div><dt>Coverage</dt><dd>{source.coverage.join(" · ")}</dd></div>
                <div><dt>Paid key</dt><dd>{source.apiKeyRequired ? "required" : "not required"}</dd></div>
              </dl>

              <p className="sourceRuntimeDetail">{source.detail}</p>
            </article>
          ))}
        </section>

        <section className="sourceManifestCard">
          <div className="sourceManifestIcon"><Download size={19} /></div>
          <div>
            <span className="eyebrow">CMS / NPPES provider index</span>
            <h2>Current download feed</h2>
            {snapshot.cms.monthly ? (
              <>
                <p>{snapshot.cms.monthly.label}</p>
                <div className="sourceManifestMeta">
                  <span>{snapshot.cms.weeklyCount} weekly update file(s) discovered</span>
                  {snapshot.cms.fetchedAt && <span>checked {new Date(snapshot.cms.fetchedAt).toLocaleString()}</span>}
                </div>
              </>
            ) : (
              <p>{snapshot.cms.error ?? "CMS manifest is temporarily unavailable. The adapter remains configured."}</p>
            )}
          </div>
        </section>

        <p className="sourceCheckedAt">Runtime snapshot checked {new Date(snapshot.checkedAt).toLocaleString()}.</p>
      </div>
    </PageShell>
  );
}

function SourceStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="sourceStat">
      <span>{icon}</span>
      <div><b>{value}</b><small>{label}</small></div>
    </div>
  );
}
