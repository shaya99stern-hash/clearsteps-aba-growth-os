export type SourcePurpose = "discover" | "enrich" | "verify" | "monitor";
export type SourceMethod = "fetch" | "download" | "browser" | "import";
export type EntityKind =
  | "territory"
  | "organization"
  | "professional"
  | "candidate"
  | "referral"
  | "community_signal"
  | "competitor_signal";

export type SourceHealth = "ready" | "degraded" | "unavailable";

export interface SourceDescriptor {
  id: string;
  name: string;
  description: string;
  purposes: SourcePurpose[];
  method: SourceMethod;
  entityKinds: EntityKind[];
  coverage: string[];
  apiKeyRequired: boolean;
  health: SourceHealth;
  usageNote: string;
}

export interface SearchEvidence {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  snippet: string;
  query: string;
  capturedAt: string;
  purpose: SourcePurpose;
  geography?: string;
}

export interface PublicSearchHit {
  title: string;
  url: string;
  snippet: string;
  query: string;
  sourceId: string;
  rank: number;
}

export interface EnrichedWebsite {
  url: string;
  finalUrl: string;
  title?: string;
  emails: string[];
  phones: string[];
  textSample: string;
  fetchedAt: string;
}

export interface ResolvedLead {
  id: string;
  name: string;
  kind: EntityKind;
  domain?: string;
  website?: string;
  location?: string;
  score: number;
  confidence: number;
  reasons: string[];
  unknowns: string[];
  emails: string[];
  phones: string[];
  evidence: SearchEvidence[];
  signals: string[];
}

export interface TerritorySignalInput {
  communityDemand: number;
  childPopulation: number;
  referralDensity: number;
  developmentalProviderDensity: number;
  abaProviderScarcity: number;
  waitlistCapacity: number;
  talentPressure: number;
  trend: number;
  evidenceConfidence: number;
}

export interface TerritoryScore {
  total: number;
  label: "Very High" | "High" | "Moderate" | "Low";
  confidence: number;
  breakdown: Record<keyof TerritorySignalInput, number>;
  reasoning: string[];
}
