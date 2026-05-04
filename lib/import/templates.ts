import type { ImportTemplate } from "@/lib/domain/types";

export const importTemplates: ImportTemplate[] = [
  {
    id: "referral_sources",
    name: "Referral Sources",
    fileName: "referral_sources_template.csv",
    description: "Organizations that may refer families to ABA, with required source-evidence fields.",
    headers: ["id","organization_name","source_type","classification","street_address","city","state","county","zip","phone","email","website","contact_name","contact_title","service_area","serves_children","serves_preschool","serves_autism","serves_developmental_delay","serves_speech_delay","serves_behavioral_concerns","offers_aba","is_competitor","source_url","evidence_summary","why_found","evidence_title","evidence_snippet","evidence_basis","detected_signals","evidence_confidence","verification_status","short_reason","notes"],
  },
  {
    id: "organizations",
    name: "Organizations",
    fileName: "organizations_template.csv",
    description: "Organization master records for referral sources, competitors, directories, and community resources.",
    headers: ["id","organization_name","organization_type","street_address","city","state","county","zip","phone","email","website","parent_organization","service_area","classification","source_url","evidence_summary","notes"],
  },
  {
    id: "contacts",
    name: "Contacts / Decision-Makers",
    fileName: "contacts_template.csv",
    description: "Real contacts tied to organizations, with role category and source URL.",
    headers: ["id","organization_id","organization_name","contact_name","title","role_category","phone","email","linkedin_url","source_url","confidence","notes"],
  },
  {
    id: "demand_signals",
    name: "Demand Signals",
    fileName: "demand_signals_template.csv",
    description: "Evidence of unmet need, waitlists, Child Find, autism support, or shortage language.",
    headers: ["id","signal_type","title","location","city","state","county","source_url","source_type","signal_text","detected_keywords","related_organization","strength","confidence","evidence_basis","short_reason","notes"],
  },
  {
    id: "competitor_signals",
    name: "Competitor / Market Signals",
    fileName: "competitor_signals_template.csv",
    description: "Direct ABA competitors and market-demand signals. These are not referral leads.",
    headers: ["id","competitor_name","location","city","state","county","website","source_url","signals_detected","offers_aba","hiring_rbt","hiring_bcba","market_demand_indicator","evidence_snippet","short_reason","notes"],
  },
  {
    id: "source_evidence",
    name: "Source Evidence",
    fileName: "source_evidence_template.csv",
    description: "Evidence records linked to organizations, opportunities, demand signals, and competitors.",
    headers: ["id","entity_id","entity_type","source_url","source_title","source_type","extracted_text","detected_signals","confidence","date_found","evidence_basis","verification_status","notes"],
  },
  {
    id: "research_runs",
    name: "Research Runs",
    fileName: "research_runs_template.csv",
    description: "Real research run metadata. No blank or fake runs should be imported.",
    headers: ["id","run_name","location","city","county","state","source_type","query_family","query_text","provider","status","started_at","completed_at","results_count","notes"],
  },
  {
    id: "payor_signals",
    name: "Payor Signals",
    fileName: "payor_signals_template.csv",
    description: "Insurance/payor notes only when backed by real source data or manual verification.",
    headers: ["id","organization_id","organization_name","payor_type","insurance_name","medicaid_relevance","commercial_relevance","source_url","confidence","notes"],
  },
];
