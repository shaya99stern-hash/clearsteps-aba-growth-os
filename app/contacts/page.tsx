import { EmptyState, InfoCard, PageShell } from "@/components/PageShell";

const roles = ["directors", "administrators", "intake coordinators", "office managers", "psychologists", "clinic owners"];

export default function ContactsPage() {
  return (
    <PageShell title="Contacts / Decision-Makers" description="Business contacts tied to organizations will appear here after verified discovery/import.">
      <div className="space-y-6">
        <EmptyState title="No contacts yet" description="Contacts must be organization-level business contacts. Do not collect parent names, child names, or diagnosis data." />
        <InfoCard title="Planned contact roles">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => <span key={role} className="rounded-xl bg-slate-50 p-3 capitalize">{role}</span>)}
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
