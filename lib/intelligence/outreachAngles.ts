import type { Classification } from "@/lib/domain/types";

export function getOutreachAngle(sourceType: string, classification: Classification) {
  if (classification === "Competitor / Market Signal") return "Do not outreach as referral lead. Save as market intelligence.";
  if (classification === "Demand Signal") return "Use as area demand evidence, then search nearby referral-source organizations.";
  const lower = sourceType.toLowerCase();
  if (lower.includes("daycare") || lower.includes("preschool")) return "Family resource support for autism evaluations, behavior concerns, developmental delays, and ABA referrals.";
  if (lower.includes("pediatric")) return "Referral pathway for families after autism/developmental-delay screening or diagnosis.";
  if (lower.includes("speech") || lower.includes("ot")) return "Complementary ABA support for children with autism, speech delay, sensory needs, or behavior concerns.";
  if (lower.includes("school")) return "Outside-school ABA support and family resource coordination.";
  return "Referral-resource introduction after evidence and decision-maker verification.";
}
