import { TaskBoard } from "@/components/TaskBoard";
import { PageShell } from "@/components/PageShell";

export default function TasksPage() {
  return (
    <PageShell title="Tasks" description="ClickUp-style operational work linked to saved referral and talent records, with local-first persistence and PostgreSQL sync when configured.">
      <TaskBoard />
    </PageShell>
  );
}
