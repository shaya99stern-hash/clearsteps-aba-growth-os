import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

const categories = ["daycares", "preschools", "psychologists", "speech clinics", "OT clinics", "pediatricians", "community organizations"];

export default function ReferralSourcesPage() {
  return (
    <PageShell title="Referral Sources" description="Saved organization-level referral partners will appear here after discovery or import.">
      <div className="space-y-6">
        <EmptyState title="No saved referral partners yet" description="Safe referral partners will appear here only after real discovery/import. No fake referral sources are seeded." />
        <InfoCard title="Referral-source categories">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => <span key={category} className="rounded-xl bg-slate-50 p-3 capitalize">{category}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
