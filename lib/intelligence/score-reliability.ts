import type { EngineScore } from "./phase3/indicator-catalog";

export type EvidenceGrade = "insufficient" | "preliminary" | "supported";
export interface OpportunityReliability {
  grade: EvidenceGrade;
  displayScore: number | null;
  label: string;
  reasons: string[];
}

/**
 * The indicator model's weighted mean describes ONLY observed inputs.
 * Treating a mean of three indicators as a market opportunity score is misleading.
 * Separate raw analytical score from whether it is publishable for decisions.
 */
export function assessOpportunityReliability(
  score: Pick<EngineScore, "score" | "coverage" | "observedIndicators" | "pillarBreakdown">,
  independentPublishers: number,
): OpportunityReliability {
  const substantivePillars = score.pillarBreakdown.filter((pillar) =>
    pillar.observed > 0 && !["evidence-quality", "relationship-quality"].includes(pillar.pillarId),
  ).length;
  const reasons: string[] = [];
  if (score.coverage < 12) reasons.push("Less than 12% of applicable indicators observed");
  if (score.observedIndicators < 12) reasons.push("Fewer than 12 applicable indicators independently observed");
  if (substantivePillars < 3) reasons.push("Fewer than 3 substantive evidence dimensions");
  if (independentPublishers < 2) reasons.push("Fewer than 2 independently published sources");

  if (reasons.length) return {
    grade: "insufficient",
    displayScore: null,
    label: "Insufficient Evidence",
    reasons,
  };
  if (score.coverage < 25 || score.observedIndicators < 25 || independentPublishers < 4) return {
    grade: "preliminary",
    displayScore: score.score,
    label: "Preliminary Estimate",
    reasons: ["Partial source and indicator coverage; confirm before using for expansion decisions"],
  };
  return {
    grade: "supported",
    displayScore: score.score,
    label: score.score >= 80 ? "Very High" :
      score.score >= 65 ? "High" : score.score >= 45 ? "Moderate" :
      score.score > 0 ? "Early Signal" : "Low",
    reasons: [],
  };
}
