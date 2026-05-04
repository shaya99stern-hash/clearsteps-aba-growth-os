import { NextResponse } from "next/server";
import { generateQueries, queryFamilies } from "@/lib/discovery/queryFamilies";
import { getSearchConnectorStatus } from "@/lib/connectors/searchProviders/searchProviderRegistry";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    location?: string;
    sourceType?: string;
    limitPerFamily?: number;
  };

  const location = body.location?.trim() ?? "";
  const sourceType = body.sourceType ?? "all";

  return NextResponse.json({
    providerStatus: getSearchConnectorStatus(),
    queryFamilies,
    queries: generateQueries(location, sourceType, body.limitPerFamily ?? 3),
    message: location ? "Query families generated. Live search requires a configured provider." : "Enter a location to generate targeted ABA referral queries.",
  });
}
