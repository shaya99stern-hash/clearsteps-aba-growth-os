import { NextResponse } from "next/server";
import { getSearchConnectorStatus } from "@/lib/connectors/searchProviders/searchProviderRegistry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    connectors: [
      getSearchConnectorStatus(),
      {
        id: "csv-import",
        name: "CSV Import",
        type: "CSV import",
        status: "configured",
        setupNote: "Blank templates are available. Imported rows must include real evidence fields; blank templates are never treated as data.",
      },
      {
        id: "web-page-fetcher",
        name: "Web Page Fetcher",
        type: "Web page fetcher",
        status: "disabled",
        setupNote: "Reserved for full-page evidence extraction. Search-result snippets are available now through public search provider results.",
      },
      {
        id: "email-connector",
        name: "Email Connector",
        type: "Email connector",
        status: "disabled",
        setupNote: "Outreach can be drafted for review. Sending requires a real email connector and compliance controls.",
      },
    ],
  });
}
