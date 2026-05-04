import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

const statuses = ["call due", "email follow-up due", "pamphlet drop", "replied", "referral relationship warming", "do not contact"];

export default function FollowUpsPage() {
  return (
    <PageShell title="Follow-Ups" description="Track follow-up tasks for verified organization-level referral relationships.">
      <div className="space-y-6">
        <EmptyState title="No follow-ups due" description="Follow-ups will appear only after real outreach preparation and manual status tracking exist." />
        <InfoCard title="Planned follow-up statuses">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {statuses.map((status) => <span key={status} className="rounded-xl bg-slate-50 p-3 capitalize">{status}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
