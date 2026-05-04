import type { DiscoveryOpportunity, NormalizedSearchResult } from "@/lib/domain/types";
import { scoreOpportunity } from "@/lib/intelligence/opportunityScoring";
import { buildRecommendation, recommendedContactRoles } from "@/lib/intelligence/recommendations";
import { classifySearchResult, reasonForClassification, shortReasonForResult } from "./sourceClassifier";
import { confidenceFromSignalCount, extractSignals } from "./signalExtraction";

function stableId(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return `opp-${Math.abs(hash)}`;
}

function sourceTypeFromQuery(query: string) {
  const lower = query.toLowerCase();
  if (lower.includes("daycare") || lower.includes("preschool") || lower.includes("child care")) return "Daycare / Preschool";
  if (lower.includes("pediatric")) return "Pediatric Office";
  if (lower.includes("speech") || lower.includes("occupational") || lower.includes("ot")) return "Speech / OT Clinic";
  if (lower.includes("school") || lower.includes("child find") || lower.includes("iep")) return "School / Special Education";
  if (lower.includes("parent") || lower.includes("community") || lower.includes("resource")) return "Community / Parent Resource";
  if (lower.includes("hiring") || lower.includes("bcba") || lower.includes("rbt")) return "Job / Market Signal";
  return "Public Web Result";
}

export function buildOpportunityFromSearchResult(result: NormalizedSearchResult, location?: string): DiscoveryOpportunity {
  const evidenceText = `${result.title} ${result.snippet} ${result.url}`;
  const signals = extractSignals(evidenceText);
  const classification = classifySearchResult(result);
  const confidence = confidenceFromSignalCount(signals.all.length);
  const sourceType = sourceTypeFromQuery(result.queryUsed);
  const evidenceBasis = "search_snippet" as const;
  const score = scoreOpportunity({
    classification,
    signals: signals.all,
    competitorSignals: signals.competitor,
    demandSignals: signals.demand,
    referralSignals: signals.referral,
    contactSignals: signals.contact,
    evidenceUrl: result.url,
    evidenceConfidence: confidence,
    location,
    result,
  });

  return {
    id: stableId(`${result.url}-${result.queryUsed}-${result.rank}`),
    name: result.title,
    classification,
    source_type: sourceType,
    url: result.url,
    location,
    why_found: reasonForClassification(classification, signals.all),
    evidence_url: result.url,
    evidence_title: result.title,
    evidence_snippet: result.snippet,
    evidence_basis: evidenceBasis,
    detected_signals: signals.all,
    evidence_confidence: confidence,
    verification_status: confidence === "Low" ? "weak_evidence" : "needs_review",
    short_reason: shortReasonForResult(classification, signals.all),
    search_result: result,
    opportunity_score: score,
    recommendation: buildRecommendation({
      classification,
      sourceType,
      evidenceBasis,
      confidence,
      relatedSourceUrl: result.url,
    }),
    best_contact_roles: recommendedContactRoles(sourceType, classification),
  };
}

export function buildOpportunities(results: NormalizedSearchResult[], location?: string) {
  return results.map((result) => buildOpportunityFromSearchResult(result, location));
}
