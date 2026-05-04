import type { Connector } from "@/lib/domain/types";
import type { SearchProvider } from "./types";
import { serpApiProvider } from "./serpApiProvider";

export function getSearchProviders(): SearchProvider[] {
  return [serpApiProvider];
}

export function getDefaultSearchProvider(): SearchProvider {
  return serpApiProvider;
}

export function getSearchConnectorStatus(): Connector {
  return {
    id: "serpapi-public-web-search",
    name: "SerpAPI Public Web Search",
    type: "Public search provider",
    status: process.env.SERPAPI_API_KEY ? "configured" : "needs API key",
    requiredEnvVar: "SERPAPI_API_KEY",
    setupNote: "To enable live public web discovery, add SERPAPI_API_KEY to your environment variables.",
  };
}
