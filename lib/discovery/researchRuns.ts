import type { ResearchRun } from "@/lib/domain/types";

export function createResearchRun(params: {
  location: string;
  sourceType?: string;
  provider: string;
  status: ResearchRun["status"];
  resultsCount?: number;
  errors?: string[];
}): ResearchRun {
  const now = new Date().toISOString();
  return {
    id: `run-${Date.now()}`,
    run_name: `ABA referral discovery: ${params.location}`,
    location: params.location,
    source_type: params.sourceType,
    provider: params.provider,
    status: params.status,
    started_at: now,
    completed_at: params.status === "running" ? undefined : now,
    results_count: params.resultsCount ?? 0,
    errors: params.errors ?? [],
  };
}
