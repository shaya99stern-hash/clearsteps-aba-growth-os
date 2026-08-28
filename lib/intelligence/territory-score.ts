import type { ResolvedLead, TerritoryScore, TerritorySignalInput } from "./source-types";

const WEIGHTS: Record<keyof TerritorySignalInput, number> = {
  communityDemand: 20,
  childPopulation: 10,
  referralDensity: 15,
  developmentalProviderDensity: 10,
  abaProviderScarcity: 15,
  waitlistCapacity: 10,
  talentPressure: 10,
  trend: 5,
  evidenceConfidence: 5,
};

export function scoreTerritory(input: TerritorySignalInput): TerritoryScore {
  const normalized = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, clamp(value)]),
  ) as Record<keyof TerritorySignalInput, number>;
  const breakdown = Object.fromEntries(
    (Object.keys(WEIGHTS) as Array<keyof TerritorySignalInput>).map((key) => [
      key,
      Math.round((normalized[key] / 100) * WEIGHTS[key]),
    ]),
  ) as Record<keyof TerritorySignalInput, number>;
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const confidence = Math.round((normalized.evidenceConfidence * 0.6) + (average(Object.values(normalized)) * 0.4));
  return {
    total,
    label: total >= 80 ? "Very High" : total >= 65 ? "High" : total >= 45 ? "Moderate" : "Low",
    confidence,
    breakdown,
    reasoning: [
      `Community demand contributes ${breakdown.communityDemand}/20.`,
      `Referral-source density contributes ${breakdown.referralDensity}/15.`,
      `ABA provider scarcity contributes ${breakdown.abaProviderScarcity}/15.`,
      `Talent pressure contributes ${breakdown.talentPressure}/10.`,
      `Evidence confidence contributes ${breakdown.evidenceConfidence}/5.`,
    ],
  };
}

export function inferTerritorySignals(leads: ResolvedLead[]): TerritorySignalInput {
  const community = leads.filter((lead) => lead.kind === "community_signal");
  const referral = leads.filter((lead) => lead.kind === "referral");
  const organizations = leads.filter((lead) => lead.kind === "organization");
  const talent = leads.filter((lead) => lead.kind === "candidate" || lead.kind === "talent_signal");
  const waitlistMentions = leads.filter((lead) => lead.signals.includes("waitlist") || lead.signals.includes("wait list"));
  const abaProviders = organizations.filter((lead) => lead.signals.includes("aba") || lead.signals.includes("applied behavior"));
  const providerEvidenceSufficient = organizations.length >= 3;
  const evidenceConfidence = leads.length ? average(leads.map((lead) => lead.confidence)) : 0;

  return {
    communityDemand: scaled(community.length, 12),
    childPopulation: 0,
    referralDensity: scaled(referral.length, 18),
    developmentalProviderDensity: scaled(leads.filter((lead) =>
      ["psychologist", "evaluation", "pediatric", "speech", "occupational", "early intervention"].some((signal) => lead.signals.includes(signal)),
    ).length, 16),
    abaProviderScarcity: providerEvidenceSufficient ? Math.max(15, 100 - scaled(abaProviders.length, 14)) : 0,
    waitlistCapacity: scaled(waitlistMentions.length, 8),
    talentPressure: scaled(talent.length + leads.filter((lead) => lead.signals.includes("hiring")).length, 12),
    trend: 0,
    evidenceConfidence,
  };
}

function scaled(value: number, strongAt: number) {
  return clamp(Math.round((value / strongAt) * 100));
}
function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}
