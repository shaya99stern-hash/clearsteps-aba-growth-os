export const positiveReferralSignals = [
  "children",
  "toddler",
  "preschool",
  "pediatric",
  "child development",
  "speech delay",
  "language delay",
  "occupational therapy",
  "sensory processing",
  "developmental delay",
  "special needs",
  "iep",
  "early intervention",
  "behavioral concerns",
  "family support",
  "referrals",
  "care coordination",
  "parent resources",
];

export const demandSignals = [
  "waitlist",
  "shortage",
  "limited providers",
  "need for services",
  "families seeking services",
  "parent concern",
  "autism support",
  "developmental screening",
  "child find",
  "special education committee",
  "board minutes",
  "resource fair",
  "community need",
  "medicaid services",
  "insurance support",
];

export const competitorSignals = [
  "aba therapy",
  "applied behavior analysis",
  "bcba",
  "rbt",
  "behavior technician",
  "in-home aba",
  "center-based aba",
  "autism therapy provider",
  "behavior analyst",
  "accepts aba referrals",
  "aba clinic",
];

export const contactSignals = [
  "director",
  "owner",
  "administrator",
  "program director",
  "executive director",
  "clinical director",
  "office manager",
  "practice manager",
  "referral coordinator",
  "care coordinator",
  "family services coordinator",
  "principal",
  "special education coordinator",
];

export const negativeSignals = [
  "adult-only",
  "adult only",
  "geriatric",
  "senior care",
  "unrelated specialty",
  "duplicate result",
];

function matchSignals(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term));
}

export function extractSignals(input: string) {
  const text = input || "";
  const referral = matchSignals(text, positiveReferralSignals);
  const demand = matchSignals(text, demandSignals);
  const competitor = matchSignals(text, competitorSignals);
  const contact = matchSignals(text, contactSignals);
  const negative = matchSignals(text, negativeSignals);

  return {
    referral,
    demand,
    competitor,
    contact,
    negative,
    all: Array.from(new Set([...referral, ...demand, ...competitor, ...contact, ...negative])),
  };
}

export function confidenceFromSignalCount(count: number): "High" | "Medium" | "Low" {
  if (count >= 4) return "High";
  if (count >= 2) return "Medium";
  return "Low";
}
