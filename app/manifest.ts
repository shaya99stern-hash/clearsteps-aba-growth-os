import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ABA Engine · Clear Steps",
    short_name: "ABA Engine",
    description: "Missouri and Kansas ABA client, RBT, and BCBA intelligence with evidence-first CRM workflows.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0f",
    theme_color: "#0d0d0f",
    icons: [
      {
        src: "/api/app-icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
