import { PageShell } from "@/components/PageShell";
import { WorkspaceToday } from "@/components/ReferenceWorkspace";
export default function TodayPage() {
  return <PageShell compact title="Today" description="Your work for today."><WorkspaceToday /></PageShell>;
}
