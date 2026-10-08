import { PageShell } from "@/components/PageShell";
import { IntelligenceHub } from "@/components/IntelligenceHub";

export default function IntelligencePage() {
  return (
    <PageShell title="Intelligence" description="Next-best-action workspace connected to Scout findings, referral and talent CRM, and tasks.">
      <IntelligenceHub />
    </PageShell>
  );
}
