import { EmptyState, PageShell } from "@/components/PageShell";

export default function OrganizationsPage() {
  return (
    <PageShell title="Organizations" description="Parent entities, clinics, schools, referral partners, and community organizations will be normalized here.">
      <EmptyState title="No organizations yet" description="Organizations will appear after real discovery/import. Duplicates should be reviewed by name, website domain, phone, address, city/state, and source URL before merging." />
    </PageShell>
  );
}
