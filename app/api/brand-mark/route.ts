const NAVI_MARK_URL = "https://navi-deed-search.vercel.app/api/property-scout-icon";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET() {
  const response = await fetch(NAVI_MARK_URL, { next: { revalidate } });
  if (!response.ok) {
    return new Response("Brand mark unavailable", { status: 503 });
  }

  const bytes = await response.arrayBuffer();
  return new Response(bytes, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
