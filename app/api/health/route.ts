import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    serpapiConfigured: Boolean(process.env.SERPAPI_API_KEY),
  });
}
