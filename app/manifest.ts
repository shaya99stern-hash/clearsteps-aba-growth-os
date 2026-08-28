import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clear Steps",
    short_name: "Clear Steps",
    description: "ABA territory intelligence, referral growth, talent sourcing, outreach, and CRM.",
    start_url: "/",
    display: "standalone",
    background_color: "#111113",
    theme_color: "#111113",
  };
}
