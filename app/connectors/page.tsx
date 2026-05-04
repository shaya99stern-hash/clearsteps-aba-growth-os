import { ConnectorCard } from "@/components/ConnectorCards";
import { PageShell } from "@/components/PageShell";

export default function ConnectorsPage() {
  const serpapiConfigured = Boolean(process.env.SERPAPI_API_KEY);

  return (
    <PageShell title="Connectors" description="Configure discovery, import, enrichment, and outreach infrastructure without exposing secrets to the browser.">
      <div className="grid gap-4 lg:grid-cols-2">
        <ConnectorCard
          title="SerpAPI Public Web Search"
          status={serpapiConfigured ? "configured" : "needs API key"}
          requiredEnvVar="SERPAPI_API_KEY"
          description="Server-side public web search provider. The key value is never shown in the UI."
          powers={["public web discovery", "competitor scanning", "referral source search"]}
          nextStep={serpapiConfigured ? "Run a discovery search." : "Add SERPAPI_API_KEY in Vercel."}
        />
        <ConnectorCard
          title="CSV Import"
          status="configured"
          description="Template-driven import workflow for real organization-level records."
          powers={["template downloads", "header validation architecture", "evidence field preservation"]}
          nextStep="Download a blank template and prepare real rows only."
        />
        <ConnectorCard
          title="Email / Gmail"
          status="disabled"
          description="Placeholder for future review-based email workflow."
          powers={["draft preparation", "manual review workflow", "future connector support"]}
          nextStep="Configure compliance settings before enabling any sending workflow."
        />
        <ConnectorCard
          title="Enrichment Providers"
          status="disabled"
          description="Placeholder for future organization-level enrichment providers."
          powers={["organization enrichment", "contact role verification", "source evidence linking"]}
          nextStep="Select compliant enrichment provider and add credentials later."
        />
      </div>
    </PageShell>
  );
}
