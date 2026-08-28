import { PageShell } from "@/components/PageShell";
import { ScoutWorkbench } from "@/components/ScoutWorkbench";

export default function HomePage() {
  return (
    <PageShell
      compact
      title="Scout"
      description="Search public sources, cross-reference ABA demand and referral opportunity, and route qualified leads into the CRM."
    >
      <ScoutWorkbench />
    </PageShell>
  );
}
