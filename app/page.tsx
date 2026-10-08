import { PageShell } from "@/components/PageShell";
import { ScoutWorkbench } from "@/components/ScoutWorkbench";
import type { ScoutEngine, ScoutState } from "@/lib/intelligence/scout-history";

type RouteParams = Record<string, string | string[] | undefined>;
function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}
export default async function HomePage({ searchParams }: { searchParams: Promise<RouteParams> }) {
  const params = await searchParams;
  const candidateState = single(params.state);
  const candidateEngine = single(params.engine);
  const state: ScoutState = candidateState === "KS" || candidateState === "CO" ? candidateState : "MO";
  const engine: ScoutEngine = candidateEngine === "rbt" || candidateEngine === "bcba" ? candidateEngine : "client";
  const location = single(params.location).slice(0, 160);
  const query = single(params.query).slice(0, 1000);
  return (
    <PageShell compact title="Scout" description="Research public ABA market signals and route qualified opportunities into CRM.">
      <ScoutWorkbench initialState={state} initialEngine={engine} initialLocation={location} initialQuery={query} />
    </PageShell>
  );
}
