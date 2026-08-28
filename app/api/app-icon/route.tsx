import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #d9c8ff 0%, #b99cf4 48%, #9270dd 100%)",
          color: "#17131f",
          borderRadius: 112,
          fontFamily: "Arial, Helvetica, sans-serif",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,.34)",
        }}
      >
        <div style={{ display: "flex", fontSize: 150, fontWeight: 900, letterSpacing: -12, lineHeight: 1 }}>ABA</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 46, fontWeight: 800, letterSpacing: 14 }}>ENGINE</div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
