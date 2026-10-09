import { PageShell } from "@/components/PageShell";
import { TerritoryMap } from "@/components/TerritoryMap";

type RouteParams = Record<string, string | string[] | undefined>;

export default async function MapPage({ searchParams }: { searchParams: Promise<RouteParams> }) {
  const params = await searchParams;
  const state = params.state === "KS" || params.state === "CO" ? params.state : "MO";
  return (
    <PageShell title="Map" description="County scores, census-tract hotspots, child care, ABA providers and referral sources, narrowed to 2, 5 and 10 miles.">
      <TerritoryMap initialState={state} />
    </PageShell>
  );
}
