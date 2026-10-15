import { PageShell } from "@/components/PageShell";
import { WorkspaceHome } from "@/components/ReferenceWorkspace";
import { redirect } from "next/navigation";

type RouteParams = Record<string, string | string[] | undefined>;
export default async function HomePage({ searchParams }: { searchParams: Promise<RouteParams> }) {
  const params = await searchParams;
  // Previously saved research links used /?state=... . Keep their scope intact.
  if (["state", "engine", "location", "query"].some((key) => params[key] !== undefined)) {
    const search = new URLSearchParams();
    for (const key of ["state", "engine", "location", "query"]) {
      const value = params[key];
      if (typeof value === "string") search.set(key, value);
    }
    redirect(`/scout?${search}`);
  }
  return (
    <PageShell compact title="Home" description="Your Clear Steps workspace.">
      <WorkspaceHome />
    </PageShell>
  );
}
