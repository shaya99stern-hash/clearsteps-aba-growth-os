import type { CrossReferenceResult, DiscoveryOpportunity } from "@/lib/domain/types";

export function crossReferenceOpportunity(opportunity: DiscoveryOpportunity, nearby: DiscoveryOpportunity[] = []): CrossReferenceResult {
  const related = nearby.filter((item) => item.id !== opportunity.id && item.location === opportunity.location);
  const relatedSignals = related.filter((item) => item.classification === "Demand Signal").map((item) => item.name);
  const relatedCompetitors = related.filter((item) => item.classification === "Competitor / Market Signal").map((item) => item.name);

  return {
    relatedSignals,
    relatedCompetitors,
    duplicateMatches: [],
    reasoning: [
      relatedSignals.length > 0 ? "Nearby demand signals exist in the same service area." : "No nearby demand signal has been linked yet.",
      relatedCompetitors.length > 0 ? "Nearby competitor/market signals exist; use as demand/saturation context." : "No nearby competitor signal has been linked yet.",
    ],
    strength: Math.min(10, relatedSignals.length * 3 + relatedCompetitors.length * 2),
  };
}
