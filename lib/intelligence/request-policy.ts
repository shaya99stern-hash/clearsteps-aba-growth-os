export type ResearchPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

const SENSITIVE_CONTEXT = [
  "autism", "autistic", "diagnosis", "diagnosed", "aba", "disability", "disabled", "special needs",
];

const INDIVIDUAL_TARGETING = [
  "find autistic children",
  "find children with autism",
  "find families with autism",
  "specific child",
  "child named",
  "home address",
  "street address of",
  "lives at",
  "houses with autistic",
  "homes with autistic",
  "addresses with autistic",
];

export function evaluateResearchRequest(query: string): ResearchPolicyDecision {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  const sensitive = SENSITIVE_CONTEXT.some((term) => normalized.includes(term));
  const targetsIndividual = INDIVIDUAL_TARGETING.some((term) => normalized.includes(term));

  if (sensitive && targetsIndividual) {
    return {
      allowed: false,
      reason: "Clear Steps can analyze ABA need at territory level and find legitimate organizations or professionals, but it cannot identify households, children, or families based on disability or health information.",
    };
  }

  return { allowed: true };
}
