import { CrmPipeline } from "@/components/CrmPipeline";
import { PageShell } from "@/components/PageShell";

export default function PipelinePage() {
  return (
    <PageShell title="Referral Pipeline" description="HubSpot-style progression for evidence-backed referral organizations discovered by Scout.">
      <CrmPipeline mode="referral" />
    </PageShell>
  );
}
