import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

const sections = ["territory score", "referral fit score", "competitor risk", "insurance overlap", "contactability", "next best action"];

export default function IntelligencePage() {
  return (
    <PageShell title="Intelligence / Recommendations" description="Scoring and next-best-action logic for organization-level referral opportunities.">
      <div className="space-y-6">
        <EmptyState title="No intelligence scores yet" description="Scores require real discovery/imported data and evidence. No fake scores are generated." />
        <InfoCard title="Scoring engine placeholders">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => <span key={section} className="rounded-xl bg-slate-50 p-3 capitalize">{section}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
