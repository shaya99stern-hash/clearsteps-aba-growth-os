import { EmptyState, PageShell } from "@/components/PageShell";

export default function TasksPage() {
  return (
    <PageShell title="Tasks" description="ClickUp-style operational work linked to territories, organizations, candidates, campaigns, and referrals.">
      <EmptyState title="Task engine foundation is ready for persistence" description="The CRM schema includes tasks and activity history. No demo tasks are seeded." />
    </PageShell>
  );
}
