export type EvidenceBasis = "search_snippet" | "page_content" | "imported_csv" | "manual_entry";

export type EvidenceConfidence = "High" | "Medium" | "Low";

export type VerificationStatus = "verified" | "needs_review" | "weak_evidence" | "missing_evidence";

export type Classification =
  | "Referral Source"
  | "Demand Signal"
  | "Competitor / Market Signal"
  | "Contact Target"
  | "Directory Source"
  | "Weak / Unclear Result"
  | "Duplicate"
  | "Out of Service Area";

export interface EvidenceFields {
  why_found: string;
  evidence_url?: string;
  evidence_title?: string;
  evidence_snippet?: string;
  evidence_basis?: EvidenceBasis;
  detected_signals: string[];
  evidence_confidence: EvidenceConfidence;
  verification_status: VerificationStatus;
  short_reason: string;
}

export interface NormalizedSearchResult {
  title: string;
  url: string;
  snippet: string;
  displayedUrl?: string;
  sourceProvider: string;
  rank: number;
  queryUsed: string;
}

export interface SearchQuery {
  id: string;
  family: string;
  query: string;
  location: string;
  sourceType?: string;
}

export interface QueryFamily {
  id: string;
  label: string;
  intent: string;
  templates: string[];
}

export interface ReferralSource extends EvidenceFields {
  id: string;
  organization_name: string;
  source_type: string;
  classification: Classification;
  street_address?: string;
  city?: string;
  state?: string;
  county?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  contact_name?: string;
  contact_title?: string;
  service_area?: string;
  serves_children?: boolean;
  serves_preschool?: boolean;
  serves_autism?: boolean;
  serves_developmental_delay?: boolean;
  serves_speech_delay?: boolean;
  serves_behavioral_concerns?: boolean;
  offers_aba?: boolean;
  is_competitor?: boolean;
  notes?: string;
}

export interface Organization extends EvidenceFields {
  id: string;
  organization_name: string;
  organization_type: string;
  classification: Classification;
  website?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  county?: string;
  parent_organization?: string;
  service_area?: string;
  notes?: string;
}

export interface Contact {
  id: string;
  organization_id?: string;
  organization_name?: string;
  contact_name?: string;
  title?: string;
  role_category?: string;
  phone?: string;
  email?: string;
  linkedin_url?: string;
  source_url?: string;
  confidence: EvidenceConfidence;
  notes?: string;
}

export interface DemandSignal extends EvidenceFields {
  id: string;
  signal_type: string;
  title: string;
  location: string;
  city?: string;
  state?: string;
  county?: string;
  source_type?: string;
  signal_text: string;
  related_organization?: string;
  strength: "Strong" | "Moderate" | "Weak";
  notes?: string;
}

export interface CompetitorSignal extends EvidenceFields {
  id: string;
  competitor_name: string;
  location?: string;
  city?: string;
  state?: string;
  county?: string;
  website?: string;
  offers_aba: boolean;
  hiring_rbt?: boolean;
  hiring_bcba?: boolean;
  market_demand_indicator?: string;
  notes?: string;
}

export interface SourceEvidence {
  id: string;
  entity_id: string;
  entity_type: Classification | "Organization" | "Contact";
  source_url?: string;
  source_title?: string;
  source_type: EvidenceBasis;
  extracted_text?: string;
  detected_signals: string[];
  confidence: EvidenceConfidence;
  date_found: string;
  evidence_basis: EvidenceBasis;
  verification_status: VerificationStatus;
  notes?: string;
}

export interface OpportunityScore {
  total: number;
  classification: string;
  breakdown: {
    referralAccess: number;
    needSignal: number;
    nonCompetitor: number;
    contactability: number;
    crossReferenceStrength: number;
    localServiceAreaFit: number;
    payorFit: number;
    evidenceConfidence: number;
  };
  reasoning: string[];
}

export interface Recommendation {
  recommended_action: string;
  reason: string;
  evidence_basis?: EvidenceBasis;
  confidence: EvidenceConfidence;
  related_source_url?: string;
}

export interface ResearchRun {
  id: string;
  run_name: string;
  location: string;
  source_type?: string;
  query_family?: string;
  provider: string;
  status: "not_started" | "running" | "completed" | "error" | "provider_not_configured";
  started_at?: string;
  completed_at?: string;
  results_count: number;
  errors: string[];
}

export interface DiscoveryOpportunity extends EvidenceFields {
  id: string;
  name: string;
  classification: Classification;
  source_type: string;
  url?: string;
  location?: string;
  search_result: NormalizedSearchResult;
  opportunity_score: OpportunityScore;
  recommendation: Recommendation;
  best_contact_roles: string[];
}

export interface Connector {
  id: string;
  name: string;
  type: string;
  status: "configured" | "not configured" | "needs API key" | "connected" | "error" | "disabled";
  requiredEnvVar?: string;
  setupNote?: string;
  error?: string;
}

export interface PayorSignal {
  id: string;
  organization_id?: string;
  organization_name?: string;
  likely_payor_mix?: string;
  medicaid_relevance?: string;
  commercial_insurance_relevance?: string;
  accepted_insurance_notes?: string;
  insurance_source_url?: string;
  payor_confidence?: EvidenceConfidence;
  payor_fit_score?: number;
  payor_notes?: string;
}

export interface EntityMatch {
  duplicate_confidence: EvidenceConfidence;
  matching_fields: string[];
  suggested_merge: boolean;
  evidence_comparison: string;
}

export interface CrossReferenceResult {
  relatedSignals: string[];
  relatedCompetitors: string[];
  duplicateMatches: EntityMatch[];
  reasoning: string[];
  strength: number;
}

export interface ImportTemplate {
  id: string;
  name: string;
  fileName: string;
  description: string;
  headers: string[];
}

export interface ImportResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
}

export interface OutreachEvent {
  id: string;
  entity_id: string;
  status: "draft" | "ready_for_review" | "sent" | "follow_up_due" | "closed";
  last_contacted_date?: string;
  next_follow_up_date?: string;
  contact_method?: string;
  notes?: string;
  draft_message?: string;
  call_script?: string;
  outreach_angle?: string;
  opt_out_compliance_notes?: string;
}
