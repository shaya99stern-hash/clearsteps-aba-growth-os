/**
 * Structured public data programs used by the county data joins.
 *
 * Every metric is an AREA-LEVEL aggregate (county or state). Nothing here identifies,
 * profiles or infers anything about an individual child, family or household.
 */
export type JoinState = "MO" | "KS" | "CO";

export type ProgramId =
  | "census-acs5"
  | "census-saipe"
  | "census-sahie"
  | "census-cbp"
  | "census-tiger"
  | "hrsa-hpsa-mh"
  | "state-childcare-licensing";

export interface ProgramDefinition {
  id: ProgramId;
  label: string;
  publisher: string;
  /** How the numbers are produced. Two programs with different methods are independent measurements. */
  method: "household survey" | "statistical model" | "business register" | "geographic boundary" | "federal designation" | "state licensing roster";
  url: string;
}

export const PROGRAMS: Record<ProgramId, ProgramDefinition> = {
  "census-acs5": {
    id: "census-acs5",
    label: "American Community Survey 5-year",
    publisher: "U.S. Census Bureau",
    method: "household survey",
    url: "https://www.census.gov/programs-surveys/acs",
  },
  "census-saipe": {
    id: "census-saipe",
    label: "Small Area Income and Poverty Estimates",
    publisher: "U.S. Census Bureau",
    method: "statistical model",
    url: "https://www.census.gov/programs-surveys/saipe.html",
  },
  "census-sahie": {
    id: "census-sahie",
    label: "Small Area Health Insurance Estimates",
    publisher: "U.S. Census Bureau",
    method: "statistical model",
    url: "https://www.census.gov/programs-surveys/sahie.html",
  },
  "census-cbp": {
    id: "census-cbp",
    label: "County Business Patterns",
    publisher: "U.S. Census Bureau",
    method: "business register",
    url: "https://www.census.gov/programs-surveys/cbp.html",
  },
  "census-tiger": {
    id: "census-tiger",
    label: "TIGERweb county boundaries",
    publisher: "U.S. Census Bureau",
    method: "geographic boundary",
    url: "https://tigerweb.geo.census.gov/",
  },
  "hrsa-hpsa-mh": {
    id: "hrsa-hpsa-mh",
    label: "Mental Health Professional Shortage Areas",
    publisher: "HRSA (U.S. Health Resources & Services Administration)",
    method: "federal designation",
    url: "https://data.hrsa.gov/topics/health-workforce/shortage-areas",
  },
  "state-childcare-licensing": {
    id: "state-childcare-licensing",
    label: "State licensed child-care roster (MO DHSS / CO CDEC)",
    publisher: "State child-care licensing agency",
    method: "state licensing roster",
    url: "https://gis.mo.gov/arcgis/rest/services/DHSS/Child_care/MapServer/0",
  },
};

export type MetricId =
  // ACS household survey
  | "acs.pop" | "acs.kids" | "acs.kids_u3" | "acs.kids_3to5" | "acs.kids_u6" | "acs.kids_6to17" | "acs.kids_6to11" | "acs.kids_12to17" | "acs.kids_prior"
  | "acs.hh" | "acs.hh_kids"
  | "acs.u19" | "acs.u19_employer" | "acs.u19_medicaid" | "acs.u19_uninsured"
  | "acs.kids_pov" | "acs.kids_pov_universe"
  | "acs.mhi" | "acs.mfi_kids"
  | "acs.dis_u5" | "acs.dis_u5_universe" | "acs.dis_5to17" | "acs.dis_5to17_universe"
  | "acs.cog_5to17" | "acs.cog_universe"
  | "acs.hh_no_internet" | "acs.hh_internet_universe"
  | "acs.hh_no_vehicle" | "acs.hh_vehicle_universe"
  | "acs.commute_minutes" | "acs.commuters"
  | "acs.lep_hh" | "acs.lep_universe"
  | "acs.u6_working_parents" | "acs.u6_parent_universe"
  // SAIPE model
  | "saipe.child_pov_rate" | "saipe.mhi"
  // SAHIE model (under 19)
  | "sahie.u19_insured" | "sahie.u19_uninsured" | "sahie.u19_uninsured_rate"
  // County Business Patterns establishments (employer businesses)
  | "cbp.physicians" | "cbp.psychiatrists" | "cbp.mh_practices" | "cbp.therapy_offices" | "cbp.mh_centers"
  | "cbp.hospitals" | "cbp.private_schools" | "cbp.disability_services" | "cbp.daycare" | "cbp.dd_residential"
  // TIGER geography
  | "tiger.land_sqmi" | "tiger.lat" | "tiger.lon"
  // HRSA designation
  | "hrsa.mh_hpsa_score"
  // State licensing roster
  | "lic.childcare_sites" | "lic.childcare_capacity";

export function metricProgram(metric: MetricId): ProgramId {
  const prefix = metric.slice(0, metric.indexOf("."));
  switch (prefix) {
    case "acs": return "census-acs5";
    case "saipe": return "census-saipe";
    case "sahie": return "census-sahie";
    case "cbp": return "census-cbp";
    case "tiger": return "census-tiger";
    case "hrsa": return "hrsa-hpsa-mh";
    case "lic": return "state-childcare-licensing";
    default: throw new Error("Unknown metric program for " + metric);
  }
}

/** NAICS establishment categories counted from County Business Patterns. */
export const CBP_NAICS: ReadonlyArray<{ metric: MetricId; naics: string; label: string }> = [
  { metric: "cbp.physicians", naics: "621111", label: "Offices of physicians (except mental health specialists)" },
  { metric: "cbp.psychiatrists", naics: "621112", label: "Offices of physicians, mental health specialists" },
  // ABA practices are generally classified with other non-physician mental health practitioners.
  { metric: "cbp.mh_practices", naics: "621330", label: "Offices of mental health practitioners (except physicians)" },
  { metric: "cbp.therapy_offices", naics: "621340", label: "Offices of physical, occupational and speech therapists, and audiologists" },
  { metric: "cbp.mh_centers", naics: "621420", label: "Outpatient mental health and substance abuse centers" },
  { metric: "cbp.hospitals", naics: "622110", label: "General medical and surgical hospitals" },
  { metric: "cbp.private_schools", naics: "611110", label: "Elementary and secondary schools (private)" },
  { metric: "cbp.disability_services", naics: "624120", label: "Services for the elderly and persons with disabilities" },
  { metric: "cbp.daycare", naics: "624410", label: "Child care services" },
  { metric: "cbp.dd_residential", naics: "623210", label: "Residential intellectual and developmental disability facilities" },
];

export const STATE_FIPS: Record<JoinState, string> = { MO: "29", KS: "20", CO: "08" };
export const STATE_NAMES: Record<JoinState, string> = { MO: "Missouri", KS: "Kansas", CO: "Colorado" };
