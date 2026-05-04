import type { Classification, DiscoveryOpportunity, EvidenceConfidence, NormalizedSearchResult, OpportunityScore } from "@/lib/domain/types";

function confidencePoints(confidence: EvidenceConfidence) {
  if (confidence === "High") return 5;
  if (confidence === "Medium") return 3;
  return 1;
}

function labelForScore(total: number, classification: Classification) {
  if (classification === "Competitor / Market Signal") return "Competitor / Market Signal";
  if (classification === "Demand Signal") return "Area Demand Signal";
  if (classification === "Duplicate") return "Possible Duplicate";
  if (total >= 85) return "High-Priority Referral Opportunity";
  if (total >= 70) return "Ready for Outreach";
  if (total >= 55) return "Needs Enrichment";
  if (total >= 40) return "Research Further";
  return "Low Priority";
}

export function scoreOpportunity(params: {
  classification: Classification;
  signals: string[];
  competitorSignals: string[];
  demandSignals: string[];
  referralSignals: string[];
  contactSignals: string[];
  evidenceUrl?: string;
  evidenceConfidence: EvidenceConfidence;
  location?: string;
  result?: NormalizedSearchResult;
}): OpportunityScore {
  const isCompetitor = params.classification === "Competitor / Market Signal" || params.competitorSignals.length > 0;
  const isDemandOnly = params.classification === "Demand Signal";
  const hasEvidence = Boolean(params.evidenceUrl);

  const breakdown = {
    referralAccess: params.classification === "Referral Source" ? Math.min(20, 8 + params.referralSignals.length * 4) : 0,
    needSignal: Math.min(20, params.demandSignals.length * 5 + (params.signals.includes("autism support") ? 5 : 0)),
    nonCompetitor: isCompetitor ? 0 : 15,
    contactability: params.contactSignals.length > 0 ? Math.min(15, 8 + params.contactSignals.length * 3) : 4,
    crossReferenceStrength: params.signals.length >= 4 ? 8 : params.signals.length >= 2 ? 5 : 2,
    localServiceAreaFit: params.location ? 8 : 4,
    payorFit: 0,
    evidenceConfidence: confidencePoints(params.evidenceConfidence),
  };

  let total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  if (isCompetitor) total = Math.min(total, 45);
  if (isDemandOnly) total = Math.min(total, 65);
  if (!hasEvidence) total = Math.min(total, 55);
  if (params.evidenceConfidence === "Low") total = Math.min(total, 69);

  const reasoning = [
    hasEvidence ? "Score is tied to a visible evidence URL." : "No evidence URL found, so the score is capped at Needs Enrichment.",
    isCompetitor ? "Direct ABA/BCBA/RBT language makes this market intelligence, not a referral lead." : "No direct competitor signal dominated the evidence.",
    params.demandSignals.length > 0 ? "Demand-language signals were detected from source text." : "No strong public demand signal was detected yet.",
    params.contactSignals.length > 0 ? "Contact-role language was detected." : "Decision-maker/contact evidence is still missing.",
    "Payor data is not configured, so payor score remains zero.",
  ];

  return {
    total,
    classification: labelForScore(total, params.classification),
    breakdown,
    reasoning,
  };
}

export function summarizeOpportunityMetrics(opportunities: DiscoveryOpportunity[]) {
  return {
    totalReferralOpportunities: opportunities.filter((item) => item.classification === "Referral Source").length,
    highPriority: opportunities.filter((item) => item.opportunity_score.total >= 85).length,
    readyForOutreach: opportunities.filter((item) => item.opportunity_score.total >= 70 && item.classification === "Referral Source").length,
    needsEnrichment: opportunities.filter((item) => item.opportunity_score.classification === "Needs Enrichment").length,
    demandSignals: opportunities.filter((item) => item.classification === "Demand Signal").length,
    competitorSignals: opportunities.filter((item) => item.classification === "Competitor / Market Signal").length,
    missingContact: opportunities.filter((item) => item.best_contact_roles.length > 0 && !item.search_result.snippet.toLowerCase().includes("director")).length,
    missingPhoneEmail: opportunities.filter((item) => !/\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/.test(item.search_result.snippet) && !item.search_result.snippet.includes("@")).length,
  };
}
