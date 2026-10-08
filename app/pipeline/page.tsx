import { CrmPipeline } from "@/components/CrmPipeline";
import { PageShell } from "@/components/PageShell";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ search?: string | string[] }> }) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.slice(0, 160) : "";
  return (
    <PageShell title="Referral Pipeline" description="Evidence-backed organization relationships from discovery through referrals.">
      <CrmPipeline key={search} mode="referral" initialQuery={search} />
    </PageShell>
  );
}
