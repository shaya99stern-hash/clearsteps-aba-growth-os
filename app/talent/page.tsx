import { CrmPipeline } from "@/components/CrmPipeline";
import { PageShell } from "@/components/PageShell";

export default async function TalentPage({ searchParams }: { searchParams: Promise<{ search?: string | string[] }> }) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.slice(0, 160) : "";
  return (
    <PageShell title="Talent" description="RBT and BCBA recruiting workspace, with source discovery separate from credential verification.">
      <CrmPipeline key={search} mode="talent" initialQuery={search} />
    </PageShell>
  );
}
