import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

const templates = ["daycare/preschool intro draft", "psychologist/evaluator intro draft", "speech/OT partner intro draft", "follow-up draft", "pamphlet attachment placeholder"];

export default function OutreachPage() {
  return (
    <PageShell title="Outreach Preparation" description="Prepare review-only outreach drafts for verified organization-level referral partners.">
      <div className="space-y-6">
        <EmptyState title="No outreach drafts yet" description="Sending is disabled until compliance settings, review workflow, and a real email connector are configured. Drafts should be reviewed before use." />
        <InfoCard title="Draft preparation areas">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => <span key={template} className="rounded-xl bg-slate-50 p-3 capitalize">{template}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
