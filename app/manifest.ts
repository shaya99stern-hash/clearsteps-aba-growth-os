import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clear Steps Growth OS",
    short_name: "Clear Steps",
    description: "ABA growth intelligence, referral CRM, talent, tasks, and reviewed outreach.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0f",
    theme_color: "#0d0d0f",
    icons: [
      {
        src: "/api/brand-mark",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
