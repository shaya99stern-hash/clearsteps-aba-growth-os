import type { ConnectorDefinition } from "./types";

export function getConnectorRegistry(): ConnectorDefinition[] {
  return [
    {
      id: "serpapi-public-web-search",
      name: "SerpAPI Public Web Search",
      type: "Public search provider",
      status: process.env.SERPAPI_API_KEY ? "configured" : "needs API key",
      requiredEnvVar: "SERPAPI_API_KEY",
      setupNote: "To enable live public web discovery, add SERPAPI_API_KEY to your environment variables.",
    },
    {
      id: "csv-import",
      name: "CSV Import",
      type: "CSV import",
      status: "configured",
      setupNote: "Use blank templates with real rows and evidence fields. Blank templates are not treated as data.",
    },
    {
      id: "email-connector",
      name: "Email Connector",
      type: "Email connector",
      status: "disabled",
      setupNote: "Drafting is available; sending requires a real email connector and compliance review.",
    },
  ];
}
