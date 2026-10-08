import { CrmPipeline } from "@/components/CrmPipeline";
import { PageShell } from "@/components/PageShell";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ search?: string | string[] }> }) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.slice(0, 160) : "";
  return (
    <PageShell title="Market Sources" description="Public organizational research. These are not families seeking ABA services or confirmed clients; competitor ABA providers are market intelligence only.">
      <CrmPipeline key={search} mode="referral" initialQuery={search} />
    </PageShell>
  );
}
