import type { NormalizedSearchResult } from "@/lib/domain/types";
import type { SearchProvider, SearchProviderParams, SearchProviderResponse } from "./types";
import { SearchProviderError } from "./types";

type SerpApiOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
  position?: number;
};

type SerpApiResponse = {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
};

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

export class SerpApiProvider implements SearchProvider {
  id = "serpapi-google-search";
  name = "SerpAPI Public Web Search";
  configured = Boolean(process.env.SERPAPI_API_KEY);
  supportedResultTypes = ["organic_results"];

  async search(params: SearchProviderParams): Promise<SearchProviderResponse> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      throw new SearchProviderError("missing_api_key", "SERPAPI_API_KEY is not configured.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const url = new URL(SERPAPI_ENDPOINT);
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", params.query);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("num", String(Math.min(params.limit ?? 10, 20)));
      url.searchParams.set("hl", params.language ?? "en");
      url.searchParams.set("gl", params.country ?? "us");
      if (params.location) url.searchParams.set("location", params.location);
      if (params.page && params.page > 1) url.searchParams.set("start", String((params.page - 1) * (params.limit ?? 10)));

      const response = await fetch(url, { signal: controller.signal, cache: "no-store" });

      if (response.status === 429) {
        throw new SearchProviderError("rate_limit", "SerpAPI rate limit or quota reached.");
      }

      if (!response.ok) {
        throw new SearchProviderError("network_error", `SerpAPI request failed with status ${response.status}.`);
      }

      const data = (await response.json()) as SerpApiResponse;

      if (data.error) {
        const code = data.error.toLowerCase().includes("limit") ? "rate_limit" : "invalid_response";
        throw new SearchProviderError(code, data.error);
      }

      if (!Array.isArray(data.organic_results)) {
        throw new SearchProviderError("invalid_response", "SerpAPI response did not include organic_results.");
      }

      const results: NormalizedSearchResult[] = data.organic_results
        .filter((item) => item.title && item.link)
        .slice(0, params.limit ?? 10)
        .map((item, index) => ({
          title: item.title ?? "Untitled result",
          url: item.link ?? "",
          snippet: item.snippet ?? "",
          displayedUrl: item.displayed_link,
          sourceProvider: this.id,
          rank: item.position ?? index + 1,
          queryUsed: params.query,
        }));

      if (results.length === 0) {
        throw new SearchProviderError("no_results", "Search completed but returned no organic results.");
      }

      return { results, provider: this.id, queryUsed: params.query };
    } catch (error) {
      if (error instanceof SearchProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new SearchProviderError("timeout", "Search provider request timed out.");
      }
      throw new SearchProviderError("network_error", error instanceof Error ? error.message : "Unknown search provider error.");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const serpApiProvider = new SerpApiProvider();
