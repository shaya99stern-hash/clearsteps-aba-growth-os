import Link from "next/link";
import { InfoCard, PageShell } from "@/components/PageShell";

export default function SettingsPage() {
  return (
    <PageShell title="Settings" description="What this workspace actually does, and what requires verification before an operational decision.">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="New research: Missouri + Kansas" description="Scout acquires public, organization-level evidence for Clients, RBTs, and BCBAs. Historical records from other states remain in the CRM; they do not change the new-research scope.">
          <Link href="/" className="underline underline-offset-4">Open Scout →</Link>
        </InfoCard>
        <InfoCard title="Storage and synchronization" description="The most recent 30 summarized Scout research results are kept on this device for immediate comparison. CRM, tasks and full server research records use PostgreSQL when DATABASE_URL is configured; device storage remains available as a fallback.">
          <Link href="/connectors" className="underline underline-offset-4">Inspect source availability →</Link>
        </InfoCard>
        <InfoCard title="Coverage and credentials" description="A high research score is not proof of payer acceptance, state licensure or recruiting eligibility. Check current official rules and direct primary-source evidence before acting.">
          <Link href="/intelligence" className="underline underline-offset-4">Review intelligence →</Link>
        </InfoCard>
        <InfoCard title="Outreach protections" description="Manual review is mandatory. No patient/household targeting, private-group scraping, PHI-based mass marketing or scraping registries solely for recruiting. Sending is intentionally disabled until an authorized compliance-reviewed delivery workflow exists.">
          <Link href="/outreach" className="underline underline-offset-4">Reviewed outreach drafts →</Link>
        </InfoCard>
      </div>
    </PageShell>
  );
}
