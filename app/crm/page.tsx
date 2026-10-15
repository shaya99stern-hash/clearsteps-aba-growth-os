import { PageShell } from "@/components/PageShell";
import { WorkspaceCrm } from "@/components/ReferenceWorkspace";
export default function CrmPage() {
  return <PageShell compact title="CRM" description="Your relationships, in one place."><WorkspaceCrm /></PageShell>;
}
