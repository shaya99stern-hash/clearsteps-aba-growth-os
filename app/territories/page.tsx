import { PageShell } from "@/components/PageShell";
import { CountyJoinBoard } from "@/components/CountyJoinBoard";
import { TerritoryBoard } from "@/components/TerritoryBoard";

export default function TerritoriesPage() {
  return (
    <PageShell title="Territories" description="Rank Missouri, Kansas and Colorado counties with cross-source public data, then review saved Scout findings.">
      <CountyJoinBoard />
      <TerritoryBoard />
    </PageShell>
  );
}
