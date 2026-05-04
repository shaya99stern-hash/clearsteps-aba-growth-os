import type { NormalizedSearchResult } from "@/lib/domain/types";

export interface SearchProviderParams {
  query: string;
  location?: string;
  limit?: number;
  page?: number;
  language?: string;
  country?: string;
  state?: string;
}

export interface SearchProviderResponse {
  results: NormalizedSearchResult[];
  provider: string;
  queryUsed: string;
  error?: string;
}

export interface SearchProvider {
  id: string;
  name: string;
  configured: boolean;
  supportedResultTypes: string[];
  search(params: SearchProviderParams): Promise<SearchProviderResponse>;
}

export class SearchProviderError extends Error {
  code: "missing_api_key" | "timeout" | "rate_limit" | "invalid_response" | "no_results" | "network_error";

  constructor(code: SearchProviderError["code"], message: string) {
    super(message);
    this.code = code;
  }
}
