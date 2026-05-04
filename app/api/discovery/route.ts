import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DiscoveryBody = {
  state?: string;
  cityOrZip?: string;
  leadType?: string;
  maxResults?: number;
  excludeCompetitors?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as DiscoveryBody;
  const state = body.state?.trim();
  const cityOrZip = body.cityOrZip?.trim();
  const leadType = body.leadType?.trim();
  const maxResults = Number(body.maxResults ?? 10);

  const errors: string[] = [];
  if (!state || !["NJ", "MO"].includes(state)) errors.push("State is required and must be NJ or MO.");
  if (!cityOrZip) errors.push("City or ZIP is required.");
  if (!leadType) errors.push("Lead type is required.");
  if (!Number.isFinite(maxResults) || maxResults < 1 || maxResults > 25) errors.push("Max results must be between 1 and 25.");

  const serpapiConfigured = Boolean(process.env.SERPAPI_API_KEY);

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, serpapiConfigured, error: errors.join(" ") }, { status: 400 });
  }

  if (!serpapiConfigured) {
    return NextResponse.json({
      ok: false,
      serpapiConfigured,
      error: "SERPAPI_API_KEY is not configured. Add it in Vercel to enable live discovery.",
      request: { state, cityOrZip, leadType, maxResults, excludeCompetitors: Boolean(body.excludeCompetitors) },
    }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    serpapiConfigured,
    status: "ready",
    message: "Live discovery wiring is ready. Ingestion/persistence is not implemented yet, so no fake leads were created.",
    request: { state, cityOrZip, leadType, maxResults, excludeCompetitors: Boolean(body.excludeCompetitors) },
    leads: [],
  });
}
