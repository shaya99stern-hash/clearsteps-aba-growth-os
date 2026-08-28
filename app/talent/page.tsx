import { CrmPipeline } from "@/components/CrmPipeline";
import { PageShell } from "@/components/PageShell";

export default function TalentPage() {
  return (
    <PageShell title="Talent" description="RBT and BCBA recruiting pipeline. Discovery and verification are kept separate so verification-only registries are never mined as recruiting lists.">
      <CrmPipeline mode="talent" />
    </PageShell>
  );
}
