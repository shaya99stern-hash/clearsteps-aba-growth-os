import { PageShell, InfoCard, MetricCard } from "@/components/PageShell";

export default function TerritoriesPage() {
  return (
    <PageShell title="Territories" description="Compare area-level ABA demand, provider supply, referral density, talent pressure, and evidence confidence without household targeting.">
      <div className="metricGrid">
        <MetricCard title="Saved territories" value="0" />
        <MetricCard title="High-demand territories" value="0" />
        <MetricCard title="Signals monitored" value="0" />
        <MetricCard title="Household profiles" value="0 — never" />
      </div>
      <div className="contentGrid">
        <InfoCard title="Territory intelligence" description="Run Scout with a city, ZIP, county, or state. Each research run computes an evidence-backed territory score from public signals." />
        <InfoCard title="Privacy boundary" description="Public road/community/special-needs signals may contribute only to de-identified geographic aggregates. Clear Steps never creates disability-targeted household leads." />
      </div>
    </PageShell>
  );
}
