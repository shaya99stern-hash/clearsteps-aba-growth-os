import { SavedResearchRuns } from "@/components/SavedResearchRuns";
import { PageShell } from "@/components/PageShell";

export default function ResearchRunsPage() {
  return (
    <PageShell title="Research Runs" description="Completed discovery scans, saved counts, warnings, and queries used by the lead engine.">
      <SavedResearchRuns />
    </PageShell>
  );
}
