import { OutreachWorkbench } from "@/components/OutreachWorkbench";
import { PageShell } from "@/components/PageShell";

export default function OutreachPage() {
  return (
    <PageShell title="Outreach" description="Build reviewed referral-partner campaign drafts from qualified CRM records while preserving suppression, no-PHI, and manual-review boundaries.">
      <OutreachWorkbench />
    </PageShell>
  );
}
