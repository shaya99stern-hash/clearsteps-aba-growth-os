import { LeadDiscoveryForm } from "@/components/LeadDiscoveryForm";
import { PageShell, InfoCard } from "@/components/PageShell";

export default function LeadDiscoveryPage() {
  return (
    <PageShell
      title="Lead Discovery"
      description="Run organization-level referral-source and market-signal discovery for Clear Steps ABA territories."
    >
      <div className="space-y-6">
        <LeadDiscoveryForm />
        <InfoCard title="Discovery rules" description="Searches must stay focused on organizations, clinics, schools, directories, and public market signals. Do not target individual parents, children, diagnoses, or private groups." />
      </div>
    </PageShell>
  );
}
