import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

const signals = [
  "ABA provider density",
  "ABA competitor detected",
  "BCBA/RBT hiring language",
  "waitlist language",
  "multiple locations",
  "in-home vs clinic-based positioning",
  "market saturation risk",
];

export default function CompetitorSignalsPage() {
  return (
    <PageShell title="Competitor / Market Signals" description="Competitor and market-saturation signals are saved as intelligence, not referral leads.">
      <div className="space-y-6">
        <EmptyState title="No competitor signals yet" description="Competitor signals will appear only from public evidence or imported records. Direct ABA providers should not be contacted as referral leads." />
        <InfoCard title="Planned market signals">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((signal) => <span key={signal} className="rounded-xl bg-slate-50 p-3 capitalize">{signal}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
