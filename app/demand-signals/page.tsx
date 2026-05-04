import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

const signals = [
  "autism prevalence signal",
  "child population signal",
  "daycare/preschool density",
  "speech/OT density",
  "psychologist/evaluator density",
  "insurance overlap",
  "public community signal",
];

export default function DemandSignalsPage() {
  return (
    <PageShell title="Demand Signals" description="Public, organization-level market signals that may indicate unmet ABA referral opportunity.">
      <div className="space-y-6">
        <EmptyState title="No demand signals yet" description="Demand signals will appear only when backed by public source evidence or imported data. The app does not claim exact child diagnosis data." />
        <InfoCard title="Planned signal types">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((signal) => <span key={signal} className="rounded-xl bg-slate-50 p-3 capitalize">{signal}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
