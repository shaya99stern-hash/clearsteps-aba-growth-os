import type { Classification, EvidenceBasis, EvidenceConfidence, Recommendation } from "@/lib/domain/types";

export function recommendedContactRoles(sourceType: string, classification: Classification) {
  if (classification === "Competitor / Market Signal") return [];
  const lower = sourceType.toLowerCase();

  if (lower.includes("daycare") || lower.includes("preschool")) return ["director", "owner", "administrator", "program director"];
  if (lower.includes("school")) return ["principal", "special education coordinator", "student services director", "preschool coordinator"];
  if (lower.includes("pediatric")) return ["office manager", "practice manager", "referral coordinator", "care coordinator", "physician owner"];
  if (lower.includes("speech") || lower.includes("ot") || lower.includes("occupational")) return ["owner", "clinical director", "office manager", "referral coordinator"];
  if (lower.includes("community") || lower.includes("parent")) return ["program director", "family services coordinator", "executive director"];
  return ["director", "office manager", "program director"];
}

export function buildRecommendation(params: {
  classification: Classification;
  sourceType: string;
  evidenceBasis?: EvidenceBasis;
  confidence: EvidenceConfidence;
  relatedSourceUrl?: string;
}): Recommendation {
  const source = params.sourceType.toLowerCase();

  if (params.classification === "Competitor / Market Signal") {
    return {
      recommended_action: "Save as market intelligence. Do not contact as a referral lead.",
      reason: "The evidence indicates direct ABA-provider or ABA-hiring language, so this is useful for market demand/saturation but not referral outreach.",
      evidence_basis: params.evidenceBasis,
      confidence: params.confidence,
      related_source_url: params.relatedSourceUrl,
    };
  }

  if (params.classification === "Demand Signal") {
    return {
      recommended_action: "Use this as area demand evidence, then search nearby pediatric offices, daycares, and speech/OT clinics.",
      reason: "Demand-only signals do not identify a referral source by themselves; they should trigger nearby source research.",
      evidence_basis: params.evidenceBasis,
      confidence: params.confidence,
      related_source_url: params.relatedSourceUrl,
    };
  }

  if (source.includes("daycare") || source.includes("preschool")) {
    return {
      recommended_action: "Call the director and ask whether families ask for help with autism evaluations, behavior concerns, developmental delays, or ABA referrals.",
      reason: "Daycare and preschool teams often see early behavior and developmental concerns before families know where to go.",
      evidence_basis: params.evidenceBasis,
      confidence: params.confidence,
      related_source_url: params.relatedSourceUrl,
    };
  }

  if (source.includes("pediatric")) {
    return {
      recommended_action: "Call the office manager or referral coordinator and offer Clear Steps ABA as a referral resource for autism/developmental-delay diagnoses.",
      reason: "Pediatric offices can be referral chokepoints for families asking what to do after screening or diagnosis.",
      evidence_basis: params.evidenceBasis,
      confidence: params.confidence,
      related_source_url: params.relatedSourceUrl,
    };
  }

  if (source.includes("speech") || source.includes("ot") || source.includes("occupational")) {
    return {
      recommended_action: "Position ABA as complementary support for children with autism, speech delay, sensory needs, or behavioral concerns.",
      reason: "Pediatric speech/OT clinics often see children whose families may also need ABA support.",
      evidence_basis: params.evidenceBasis,
      confidence: params.confidence,
      related_source_url: params.relatedSourceUrl,
    };
  }

  if (source.includes("school")) {
    return {
      recommended_action: "Ask who helps families with outside therapy resources and offer ABA support outside school hours.",
      reason: "Schools can identify need but usually cannot provide outside clinical ABA directly.",
      evidence_basis: params.evidenceBasis,
      confidence: params.confidence,
      related_source_url: params.relatedSourceUrl,
    };
  }

  return {
    recommended_action: "Verify contactability, find the correct decision-maker, and prepare a short referral-resource outreach message.",
    reason: "The source has relevant child/family signals but needs contact and role verification before outreach.",
    evidence_basis: params.evidenceBasis,
    confidence: params.confidence,
    related_source_url: params.relatedSourceUrl,
  };
}
