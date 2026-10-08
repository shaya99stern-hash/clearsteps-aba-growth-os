import { PageShell } from "@/components/PageShell";
import { TerritoryBoard } from "@/components/TerritoryBoard";

export default function TerritoriesPage() {
  return (
    <PageShell title="Territories" description="Review real Missouri and Kansas Scout findings across Clients, RBTs, and BCBAs.">
      <TerritoryBoard />
    </PageShell>
  );
}
