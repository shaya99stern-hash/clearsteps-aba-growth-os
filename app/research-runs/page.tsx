import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

export default function ResearchRunsPage() {
  return (
    <PageShell title="Research Runs" description="Completed discovery scans, errors, saved results, and excluded results will appear here after persistence is added.">
      <div className="space-y-6">
        <EmptyState title="No research runs yet" description="Completed discovery scans will appear here. No fake runs are seeded." />
        <InfoCard title="Planned run fields">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            {['query','territory','lead type','leads found','saved','excluded','errors','created date'].map((field) => <span key={field} className="rounded-xl bg-slate-50 p-3">{field}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
