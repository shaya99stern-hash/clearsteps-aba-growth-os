import { familyContactSettings } from "@/lib/intelligence/family-contact";
import Link from "next/link";
import { InfoCard, PageShell } from "@/components/PageShell";

export default function SettingsPage() {
  const familyContact=familyContactSettings(process.env);
  return (
    <PageShell title="Settings" description="What this workspace actually does, and what requires verification before an operational decision.">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Research: Missouri, Kansas & Colorado" description="Scout compares public territory demand and staffing indicators. Families are acquired only through voluntary agency inquiries, never through public school or competitor lists.">
          <Link href="/" className="underline underline-offset-4">Open Scout →</Link>
        </InfoCard>
        <InfoCard title="Family-facing intake page" description={familyContact.published
          ? "Owner-activated contact destination is configured. Confirm the service area, staff coverage and external intake workflow remain accurate."
          : "Preview only. Family inquiries cannot be accepted from this page until an authorized agency contact destination is activated."}>
          <div className="space-y-3 text-sm">
            <p>To activate: configure <code>NEXT_PUBLIC_AGENCY_PHONE</code> and/or a reviewed HTTPS <code>NEXT_PUBLIC_SECURE_INTAKE_URL</code>, then set <code>NEXT_PUBLIC_INTAKE_PUBLISHED=true</code> and redeploy.</p>
            <p>Use an appropriate privacy-reviewed intake provider for patient information. This app does not collect children's medical details and cannot validate whether an outside form meets your requirements.</p>
            <Link href="/families" className="underline underline-offset-4">Preview family entry page →</Link>
          </div>
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
