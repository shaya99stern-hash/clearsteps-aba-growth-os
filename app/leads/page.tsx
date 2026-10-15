import { PageShell } from "@/components/PageShell";
import { WorkspaceLeads } from "@/components/ReferenceWorkspace";
export default function LeadsPage() {
  return <PageShell compact title="Leads" description="Find opportunities. Research the fit. Save to CRM."><WorkspaceLeads /></PageShell>;
}
