import type { CountyFrame } from "./collectors";
import { metricProgram, type MetricId, type ProgramId } from "./sources";

export type JoinFamily = "service_gap" | "referral_network" | "payer_fit" | "access" | "need_intensity" | "validation";

export const JOIN_FAMILIES: Record<JoinFamily, { title: string; weight: number; summary: string }> = {
  service_gap: { title: "Service gap", weight: 1.4, summary: "Child demand compared with behavioral-health and therapy supply" },
  referral_network: { title: "Referral network", weight: 1, summary: "Organizations that refer families, relative to the child population" },
  payer_fit: { title: "Payer and family economics", weight: 1.1, summary: "Insurance mix and household economics for children" },
  access: { title: "Access and logistics", weight: 0.8, summary: "Distance, density, transportation and language barriers" },
  need_intensity: { title: "Developmental need intensity", weight: 1, summary: "Aggregate disability and cognitive-difficulty rates compared with services" },
  validation: { title: "Cross-source validation", weight: 0, summary: "Independent programs measuring the same thing; agreement raises confidence" },
};

type Metrics = Partial<Record<MetricId, number>>;
export interface JoinContext { self: CountyFrame; frames: readonly CountyFrame[] }

export interface JoinDefinition {
  id: string;
  family: JoinFamily;
  title: string;
  /** Why the join matters for finding ABA client demand. */
  rationale: string;
  formula: string;
  unit: string;
  metrics: readonly MetricId[];
  /** Which raw direction is more opportunity. "agreement" joins return 0–100 agreement instead. */
  opportunity: "higher" | "lower" | "agreement";
  /**
   * Base-model indicator this join fills. "opportunity" passes the opportunity percentile;
   * "supply" passes 100 − opportunity for indicators in the lower_opportunity ABA-supply pillar.
   */
  indicator?: { id: string; value: "opportunity" | "supply" };
  compute: (m: Metrics, ctx: JoinContext) => number | null;
}

const has = (m: Metrics, ...ids: MetricId[]) => ids.every((id) => typeof m[id] === "number" && Number.isFinite(m[id]));
const v = (m: Metrics, id: MetricId) => m[id] as number;
/** Ratio per `scale` units of the denominator; null when the denominator is missing or zero. */
const per = (m: Metrics, numerator: MetricId[], denominator: MetricId[], scale = 1) => {
  if (!has(m, ...numerator, ...denominator)) return null;
  const den = denominator.reduce((sum, id) => sum + v(m, id), 0);
  return den > 0 ? (numerator.reduce((sum, id) => sum + v(m, id), 0) / den) * scale : null;
};
/** People per establishment, +1 smoothing keeps zero-supply counties finite (and ranked as the largest gaps). */
const perPractice = (m: Metrics, people: MetricId[], practices: MetricId[]) => {
  if (!has(m, ...people, ...practices)) return null;
  return people.reduce((sum, id) => sum + v(m, id), 0) / (practices.reduce((sum, id) => sum + v(m, id), 0) + 1);
};
const share = (m: Metrics, part: MetricId, whole: MetricId) => per(m, [part], [whole]);
const agreementOfRates = (a: number | null, b: number | null, pointsPerUnit: number) =>
  a === null || b === null ? null : Math.max(0, Math.round(100 - Math.abs(a - b) * pointsPerUnit));

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Within-state percentile rank (0–100) of `value` among the values produced by `fn`. */
function statePercentile(frames: readonly CountyFrame[], fn: (m: Metrics) => number | null, value: number) {
  const values = frames.map((frame) => fn(frame.metrics)).filter((item): item is number => item !== null);
  if (values.length < 3) return null;
  const below = values.filter((item) => item < value).length;
  const equal = values.filter((item) => item === value).length;
  return ((below + equal / 2) / values.length) * 100;
}

const behavioralPer10k = (m: Metrics) => per(m, ["cbp.mh_practices"], ["acs.kids"], 10_000);
const disabledKids: MetricId[] = ["acs.dis_u5", "acs.dis_5to17"];
const disabledUniverse: MetricId[] = ["acs.dis_u5_universe", "acs.dis_5to17_universe"];
const ABA: MetricId = "nppes.aba_orgs";
/** CDC ADDM 2022: 32.2 per 1,000 children aged 8 (about 1 in 31). Statistical expectation only. */
const CDC_PREVALENCE = 32.2 / 1000;
const abaPer10k = (m: Metrics) => per(m, [ABA], ["acs.kids"], 10_000);
const perAba = (m: Metrics, people: MetricId[]) => perPractice(m, people, [ABA]);
const product = (a: number | null, b: number | null) => a === null || b === null ? null : a * b;

/** Agreement (0–100) between two independent per-child rates, compared as within-state percentiles. */
function rankAgreement(m: Metrics, ctx: JoinContext, a: (x: Metrics) => number | null, b: (x: Metrics) => number | null) {
  const va = a(m), vb = b(m);
  if (va === null || vb === null) return null;
  const pa = statePercentile(ctx.frames, a, va);
  const pb = statePercentile(ctx.frames, b, vb);
  return pa === null || pb === null ? null : Math.round(100 - Math.abs(pa - pb));
}

/** Distance from this county to the nearest county whose supply rate is at or above the state median (0 if this one is). */
function nearestAdequate(m: Metrics, ctx: JoinContext, rate: (x: Metrics) => number | null) {
  if (!has(m, "tiger.lat", "tiger.lon")) return null;
  const own = rate(m);
  const rates = ctx.frames.map((frame) => ({ frame, rate: rate(frame.metrics) }))
    .filter((item): item is { frame: CountyFrame; rate: number } => item.rate !== null && item.rate > 0);
  const threshold = median(rates.map((item) => item.rate));
  if (own === null || threshold === null) return null;
  if (own >= threshold) return 0;
  const distances = rates.filter((item) => item.rate >= threshold && item.frame.fips !== ctx.self.fips && has(item.frame.metrics, "tiger.lat", "tiger.lon"))
    .map((item) => haversineMiles(v(m, "tiger.lat"), v(m, "tiger.lon"), v(item.frame.metrics, "tiger.lat"), v(item.frame.metrics, "tiger.lon")));
  return distances.length ? Math.min(...distances) : null;
}

export const DATA_JOINS: readonly JoinDefinition[] = [
  // --- Service gap -------------------------------------------------------------------------
  {
    id: "J01", family: "service_gap", title: "Behavioral-health practices per 10,000 children",
    rationale: "Fewer practices per child means families have fewer local ABA and behavioral options.",
    formula: "CBP NAICS 621330 establishments ÷ ACS children under 18 × 10,000", unit: "practices / 10k children",
    metrics: ["cbp.mh_practices", "acs.kids"], opportunity: "lower",
    indicator: { id: "aba-supply.01", value: "supply" },
    compute: (m) => behavioralPer10k(m),
  },
  {
    id: "J02", family: "service_gap", title: "Behavioral-health practices per 10,000 children ages 0–5",
    rationale: "Early-intervention-age children are where ABA hours are most often authorized.",
    formula: "CBP 621330 establishments ÷ ACS children under 6 × 10,000", unit: "practices / 10k young children",
    metrics: ["cbp.mh_practices", "acs.kids_u6"], opportunity: "lower",
    compute: (m) => per(m, ["cbp.mh_practices"], ["acs.kids_u6"], 10_000),
  },
  {
    id: "J03", family: "service_gap", title: "Children with a disability per behavioral-health practice",
    rationale: "Aggregate disability counts per practice approximate how many children could need services from each provider.",
    formula: "ACS B18101 children 0–17 with a disability ÷ (CBP 621330 establishments + 1)", unit: "children / practice",
    metrics: [...disabledKids, "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => perPractice(m, disabledKids, ["cbp.mh_practices"]),
  },
  {
    id: "J04", family: "service_gap", title: "Children 5–17 with cognitive difficulty per behavioral-health practice",
    rationale: "Cognitive difficulty is the ACS measure closest to developmental need.",
    formula: "ACS B18104 children 5–17 with cognitive difficulty ÷ (CBP 621330 + 1)", unit: "children / practice",
    metrics: ["acs.cog_5to17", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.cog_5to17"], ["cbp.mh_practices"]),
  },
  {
    id: "J05", family: "service_gap", title: "Children with a disability per speech/OT/PT office",
    rationale: "Related-service bottlenecks push families toward other developmental providers, including ABA.",
    formula: "ACS B18101 children with a disability ÷ (CBP 621340 establishments + 1)", unit: "children / office",
    metrics: [...disabledKids, "cbp.therapy_offices"], opportunity: "higher",
    compute: (m) => perPractice(m, disabledKids, ["cbp.therapy_offices"]),
  },
  {
    id: "J06", family: "service_gap", title: "Children per psychiatric physician practice",
    rationale: "A diagnostic bottleneck: autism diagnoses that unlock ABA coverage often need a specialist.",
    formula: "ACS children under 18 ÷ (CBP 621112 establishments + 1)", unit: "children / practice",
    metrics: ["acs.kids", "cbp.psychiatrists"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.kids"], ["cbp.psychiatrists"]),
  },
  {
    id: "J07", family: "service_gap", title: "Children per outpatient mental-health center",
    rationale: "Thin community mental-health capacity leaves fewer alternatives for behavioral needs.",
    formula: "ACS children under 18 ÷ (CBP 621420 establishments + 1)", unit: "children / center",
    metrics: ["acs.kids", "cbp.mh_centers"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.kids"], ["cbp.mh_centers"]),
  },
  {
    id: "J08", family: "service_gap", title: "Federal mental-health shortage score × children per practice",
    rationale: "A federal shortage designation independently confirms the supply gap measured from business data.",
    formula: "HRSA Mental Health HPSA score × ACS children ÷ (CBP 621330 + 1)", unit: "score-weighted children / practice",
    metrics: ["hrsa.mh_hpsa_score", "acs.kids", "cbp.mh_practices"], opportunity: "higher",
    indicator: { id: "aba-supply.06", value: "supply" },
    compute: (m) => {
      const gap = perPractice(m, ["acs.kids"], ["cbp.mh_practices"]);
      return gap === null || !has(m, "hrsa.mh_hpsa_score") ? null : v(m, "hrsa.mh_hpsa_score") * gap;
    },
  },
  {
    id: "J09", family: "service_gap", title: "Child-population growth × children per practice",
    rationale: "A gap that is growing is more durable than one in a shrinking child population.",
    formula: "(1 + ACS under-18 change 2015–19 → latest) × ACS children ÷ (CBP 621330 + 1)", unit: "growth-weighted children / practice",
    metrics: ["acs.kids", "acs.kids_prior", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => {
      const gap = perPractice(m, ["acs.kids"], ["cbp.mh_practices"]);
      if (gap === null || !has(m, "acs.kids_prior") || v(m, "acs.kids_prior") <= 0) return null;
      const growth = (v(m, "acs.kids") - v(m, "acs.kids_prior")) / v(m, "acs.kids_prior");
      return Math.max(0, 1 + growth) * gap;
    },
  },
  {
    id: "J10", family: "service_gap", title: "Miles to the nearest well-supplied county",
    rationale: "Families in counties far from adequate supply are the least served and travel the most.",
    formula: "Centroid distance (TIGER) to the nearest county at or above the state median of CBP 621330 per ACS child; 0 if this county qualifies",
    unit: "miles", metrics: ["tiger.lat", "tiger.lon", "cbp.mh_practices", "acs.kids"], opportunity: "higher",
    indicator: { id: "aba-supply.08", value: "supply" },
    compute: (m, ctx) => nearestAdequate(m, ctx, behavioralPer10k),
  },

  // --- Referral network --------------------------------------------------------------------
  {
    id: "J11", family: "referral_network", title: "Physician offices per 10,000 children",
    rationale: "Primary-care and pediatric practices are the largest source of autism screening and ABA referrals.",
    formula: "CBP 621111 establishments ÷ ACS children × 10,000", unit: "offices / 10k children",
    metrics: ["cbp.physicians", "acs.kids"], opportunity: "higher",
    indicator: { id: "referral-ecosystem.01", value: "opportunity" },
    compute: (m) => per(m, ["cbp.physicians"], ["acs.kids"], 10_000),
  },
  {
    id: "J12", family: "referral_network", title: "Speech/OT/PT offices per 10,000 children",
    rationale: "Speech and occupational therapists frequently refer children for behavioral evaluation.",
    formula: "CBP 621340 establishments ÷ ACS children × 10,000", unit: "offices / 10k children",
    metrics: ["cbp.therapy_offices", "acs.kids"], opportunity: "higher",
    indicator: { id: "referral-ecosystem.05", value: "opportunity" },
    compute: (m) => per(m, ["cbp.therapy_offices"], ["acs.kids"], 10_000),
  },
  {
    id: "J13", family: "referral_network", title: "Licensed child-care sites per 1,000 children ages 0–5",
    rationale: "Child-care staff are often first to notice developmental concerns and point families to resources.",
    formula: "State licensed child-care sites ÷ ACS children under 6 × 1,000", unit: "sites / 1k young children",
    metrics: ["lic.childcare_sites", "acs.kids_u6"], opportunity: "higher",
    indicator: { id: "referral-ecosystem.07", value: "opportunity" },
    compute: (m) => per(m, ["lic.childcare_sites"], ["acs.kids_u6"], 1_000),
  },
  {
    id: "J14", family: "referral_network", title: "Child-care businesses per 1,000 children ages 0–5",
    rationale: "Employer child-care centers (available in every state) as a second view of the early-childhood network.",
    formula: "CBP 624410 establishments ÷ ACS children under 6 × 1,000", unit: "centers / 1k young children",
    metrics: ["cbp.daycare", "acs.kids_u6"], opportunity: "higher",
    indicator: { id: "referral-ecosystem.07", value: "opportunity" },
    compute: (m) => per(m, ["cbp.daycare"], ["acs.kids_u6"], 1_000),
  },
  {
    id: "J15", family: "referral_network", title: "General hospitals per 100,000 children",
    rationale: "Hospital pediatric departments and developmental clinics anchor diagnostic referral pathways.",
    formula: "CBP 622110 establishments ÷ ACS children × 100,000", unit: "hospitals / 100k children",
    metrics: ["cbp.hospitals", "acs.kids"], opportunity: "higher",
    indicator: { id: "access-geography.08", value: "opportunity" },
    compute: (m) => per(m, ["cbp.hospitals"], ["acs.kids"], 100_000),
  },
  {
    id: "J16", family: "referral_network", title: "Private K–12 schools per 10,000 school-age children",
    rationale: "Private schools lack district special-education teams and often refer families to outside providers.",
    formula: "CBP 611110 establishments ÷ ACS children 6–17 × 10,000", unit: "schools / 10k school-age children",
    metrics: ["cbp.private_schools", "acs.kids_6to17"], opportunity: "higher",
    compute: (m) => per(m, ["cbp.private_schools"], ["acs.kids_6to17"], 10_000),
  },
  {
    id: "J17", family: "referral_network", title: "Disability-service organizations per 1,000 children with a disability",
    rationale: "Disability service agencies coordinate care and are natural referral partners.",
    formula: "CBP 624120 establishments ÷ ACS children with a disability × 1,000", unit: "organizations / 1k children",
    metrics: ["cbp.disability_services", ...disabledKids], opportunity: "higher",
    compute: (m) => per(m, ["cbp.disability_services"], disabledKids, 1_000),
  },
  {
    id: "J18", family: "referral_network", title: "Early-childhood referral touchpoints per behavioral-health practice",
    rationale: "Licensed child-care sites and speech/OT offices see young children first; more of them per competing practice means more referral flow per provider.",
    formula: "(State licensed child-care sites + CBP 621340 establishments) ÷ (CBP 621330 + 1)", unit: "touchpoints / practice",
    metrics: ["lic.childcare_sites", "cbp.therapy_offices", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => perPractice(m, ["lic.childcare_sites", "cbp.therapy_offices"], ["cbp.mh_practices"]),
  },

  // --- Payer and family economics -----------------------------------------------------------
  {
    id: "J19", family: "payer_fit", title: "Employer-insured children per behavioral-health practice",
    rationale: "MO, KS and CO autism mandates apply to many employer plans; this is the commercial pool per provider.",
    formula: "ACS B27010 under-19 employer-insured only ÷ (CBP 621330 + 1)", unit: "children / practice",
    metrics: ["acs.u19_employer", "cbp.mh_practices"], opportunity: "higher",
    indicator: { id: "payer-economics.09", value: "opportunity" },
    compute: (m) => perPractice(m, ["acs.u19_employer"], ["cbp.mh_practices"]),
  },
  {
    id: "J20", family: "payer_fit", title: "Medicaid-covered children per behavioral-health practice",
    rationale: "MO HealthNet, KanCare and Health First Colorado cover ABA for eligible children.",
    formula: "ACS B27010 under-19 Medicaid/means-tested only ÷ (CBP 621330 + 1)", unit: "children / practice",
    metrics: ["acs.u19_medicaid", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.u19_medicaid"], ["cbp.mh_practices"]),
  },
  {
    id: "J21", family: "payer_fit", title: "Commercial payer-mix index",
    rationale: "Employer coverage share (survey) adjusted by modeled child poverty (SAIPE) to show commercial reimbursement potential.",
    formula: "ACS employer-only share of under-19 × (1 − SAIPE child poverty rate)", unit: "index 0–1",
    metrics: ["acs.u19_employer", "acs.u19", "saipe.child_pov_rate"], opportunity: "higher",
    indicator: { id: "payer-economics.10", value: "opportunity" },
    compute: (m) => {
      const employer = share(m, "acs.u19_employer", "acs.u19");
      return employer === null || !has(m, "saipe.child_pov_rate") ? null : employer * (1 - v(m, "saipe.child_pov_rate") / 100);
    },
  },
  {
    id: "J22", family: "payer_fit", title: "Insured children (two-source consensus)",
    rationale: "Insured children can access billable ABA; requires the survey and the model to agree within 4 points.",
    formula: "100 − mean(ACS under-19 uninsured %, SAHIE under-19 uninsured %), only when they agree within 4 points",
    unit: "% insured", metrics: ["acs.u19_uninsured", "acs.u19", "sahie.u19_uninsured_rate"], opportunity: "higher",
    compute: (m) => {
      const acs = per(m, ["acs.u19_uninsured"], ["acs.u19"], 100);
      if (acs === null || !has(m, "sahie.u19_uninsured_rate")) return null;
      const sahie = v(m, "sahie.u19_uninsured_rate");
      return Math.abs(acs - sahie) > 4 ? null : 100 - (acs + sahie) / 2;
    },
  },
  {
    id: "J23", family: "payer_fit", title: "Family income with children vs county median",
    rationale: "Families with children earning above the county median can better absorb copays and deductibles.",
    formula: "ACS median family income with own children ÷ SAIPE median household income", unit: "ratio",
    metrics: ["acs.mfi_kids", "saipe.mhi"], opportunity: "higher",
    compute: (m) => per(m, ["acs.mfi_kids"], ["saipe.mhi"]),
  },
  {
    id: "J24", family: "payer_fit", title: "Low-income children per behavioral-health practice",
    rationale: "Modeled low-income children are likely Medicaid-eligible, where ABA is a covered benefit.",
    formula: "ACS children × SAIPE child poverty rate ÷ (CBP 621330 + 1)", unit: "children / practice",
    metrics: ["acs.kids", "saipe.child_pov_rate", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => {
      const gap = perPractice(m, ["acs.kids"], ["cbp.mh_practices"]);
      return gap === null || !has(m, "saipe.child_pov_rate") ? null : gap * v(m, "saipe.child_pov_rate") / 100;
    },
  },
  {
    id: "J25", family: "payer_fit", title: "Commercially insured children 0–5 per behavioral-health practice",
    rationale: "Young children on employer plans are the highest-value early-intervention ABA referrals.",
    formula: "ACS children under 6 × ACS employer-only share ÷ (CBP 621330 + 1)", unit: "children / practice",
    metrics: ["acs.kids_u6", "acs.u19_employer", "acs.u19", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => {
      const young = perPractice(m, ["acs.kids_u6"], ["cbp.mh_practices"]);
      const employer = share(m, "acs.u19_employer", "acs.u19");
      return young === null || employer === null ? null : young * employer;
    },
  },
  {
    id: "J26", family: "payer_fit", title: "Working-parent children 0–5 per licensed child-care slot",
    rationale: "Where working families lack child-care slots, center-based day programs (including ABA) fill a real gap.",
    formula: "ACS B23008 children under 6 with all parents working ÷ state licensed child-care capacity", unit: "children / slot",
    metrics: ["acs.u6_working_parents", "lic.childcare_capacity"], opportunity: "higher",
    compute: (m) => per(m, ["acs.u6_working_parents"], ["lic.childcare_capacity"]),
  },

  // --- Access and logistics ----------------------------------------------------------------
  {
    id: "J27", family: "access", title: "Children per square mile",
    rationale: "Dense child populations keep in-home and clinic travel time short.",
    formula: "ACS children ÷ TIGER land area (sq mi)", unit: "children / sq mi",
    metrics: ["acs.kids", "tiger.land_sqmi"], opportunity: "higher",
    indicator: { id: "access-geography.04", value: "opportunity" },
    compute: (m) => per(m, ["acs.kids"], ["tiger.land_sqmi"]),
  },
  {
    id: "J28", family: "access", title: "Square miles per behavioral-health practice",
    rationale: "Large service areas per practice mean underserved rural families.",
    formula: "TIGER land area ÷ (CBP 621330 + 1)", unit: "sq mi / practice",
    metrics: ["tiger.land_sqmi", "cbp.mh_practices"], opportunity: "higher",
    indicator: { id: "access-geography.06", value: "opportunity" },
    compute: (m) => perPractice(m, ["tiger.land_sqmi"], ["cbp.mh_practices"]),
  },
  {
    id: "J29", family: "access", title: "Car-free households × children per practice",
    rationale: "Families without a car depend on in-home services where clinic access is thin.",
    formula: "ACS share of households with no vehicle × ACS children ÷ (CBP 621330 + 1)", unit: "index",
    metrics: ["acs.hh_no_vehicle", "acs.hh_vehicle_universe", "acs.kids", "cbp.mh_practices"], opportunity: "higher",
    indicator: { id: "access-geography.07", value: "opportunity" },
    compute: (m) => {
      const noCar = share(m, "acs.hh_no_vehicle", "acs.hh_vehicle_universe");
      const gap = perPractice(m, ["acs.kids"], ["cbp.mh_practices"]);
      return noCar === null || gap === null ? null : noCar * gap;
    },
  },
  {
    id: "J30", family: "access", title: "Average commute × children per practice",
    rationale: "Long commutes leave parents little time to drive children to clinics, favoring in-home ABA.",
    formula: "ACS mean travel time to work (B08013 ÷ B08303) × ACS children ÷ (CBP 621330 + 1) ÷ 100", unit: "index",
    metrics: ["acs.commute_minutes", "acs.commuters", "acs.kids", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => {
      const commute = per(m, ["acs.commute_minutes"], ["acs.commuters"]);
      const gap = perPractice(m, ["acs.kids"], ["cbp.mh_practices"]);
      return commute === null || gap === null ? null : (commute * gap) / 100;
    },
  },
  {
    id: "J31", family: "access", title: "Telehealth parent-training fit",
    rationale: "Connected households in large, thinly served areas suit telehealth parent training and supervision.",
    formula: "ACS share of households with internet × TIGER sq mi ÷ (CBP 621330 + 1)", unit: "index",
    metrics: ["acs.hh_no_internet", "acs.hh_internet_universe", "tiger.land_sqmi", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => {
      const offline = share(m, "acs.hh_no_internet", "acs.hh_internet_universe");
      const area = perPractice(m, ["tiger.land_sqmi"], ["cbp.mh_practices"]);
      return offline === null || area === null ? null : (1 - offline) * area;
    },
  },
  {
    id: "J32", family: "access", title: "Limited-English households × children per practice",
    rationale: "Language-access gaps are an opening for bilingual intake and parent training.",
    formula: "ACS C16002 limited-English household share × ACS children ÷ (CBP 621330 + 1)", unit: "index",
    metrics: ["acs.lep_hh", "acs.lep_universe", "acs.kids", "cbp.mh_practices"], opportunity: "higher",
    compute: (m) => {
      const lep = share(m, "acs.lep_hh", "acs.lep_universe");
      const gap = perPractice(m, ["acs.kids"], ["cbp.mh_practices"]);
      return lep === null || gap === null ? null : lep * gap;
    },
  },
  {
    id: "J33", family: "access", title: "Rural shortage overlap",
    rationale: "A federal shortage designation in a sparse county marks families with the fewest options.",
    formula: "HRSA Mental Health HPSA score × TIGER sq mi per 1,000 ACS children", unit: "index",
    metrics: ["hrsa.mh_hpsa_score", "tiger.land_sqmi", "acs.kids"], opportunity: "higher",
    compute: (m) => {
      const sparse = per(m, ["tiger.land_sqmi"], ["acs.kids"], 1_000);
      return sparse === null || !has(m, "hrsa.mh_hpsa_score") ? null : v(m, "hrsa.mh_hpsa_score") * sparse;
    },
  },

  // --- Developmental need intensity --------------------------------------------------------
  {
    id: "J34", family: "need_intensity", title: "Child disability rate × child poverty rate",
    rationale: "Compounding need: disability prevalence (survey) and modeled child poverty (SAIPE) together.",
    formula: "ACS B18101 child disability % × SAIPE child poverty % ÷ 100", unit: "index",
    metrics: [...disabledKids, ...disabledUniverse, "saipe.child_pov_rate"], opportunity: "higher",
    compute: (m) => {
      const rate = per(m, disabledKids, disabledUniverse, 100);
      return rate === null || !has(m, "saipe.child_pov_rate") ? null : (rate * v(m, "saipe.child_pov_rate")) / 100;
    },
  },
  {
    id: "J35", family: "need_intensity", title: "Children under 5 with a disability per speech/OT/PT office",
    rationale: "Early-intervention-age need compared with the therapy offices that usually see these children first.",
    formula: "ACS B18101 children under 5 with a disability ÷ (CBP 621340 + 1)", unit: "children / office",
    metrics: ["acs.dis_u5", "cbp.therapy_offices"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.dis_u5"], ["cbp.therapy_offices"]),
  },
  {
    id: "J36", family: "need_intensity", title: "Developmental-disability service footprint per 1,000 children with cognitive difficulty",
    rationale: "A thin disability-service footprint relative to cognitive need marks an under-built system.",
    formula: "(CBP 624120 + 623210 establishments) ÷ ACS children 5–17 with cognitive difficulty × 1,000", unit: "organizations / 1k children",
    metrics: ["cbp.disability_services", "cbp.dd_residential", "acs.cog_5to17"], opportunity: "lower",
    compute: (m) => per(m, ["cbp.disability_services", "cbp.dd_residential"], ["acs.cog_5to17"], 1_000),
  },

  // --- Cross-source validation (agreement 0–100) --------------------------------------------
  {
    id: "J37", family: "validation", title: "Child poverty: ACS survey vs SAIPE model",
    rationale: "Two independent methods for the same rate; disagreement means the county's income data is uncertain.",
    formula: "100 − 5 × |ACS B17020 child poverty % − SAIPE 0–17 poverty %|", unit: "agreement / 100",
    metrics: ["acs.kids_pov", "acs.kids_pov_universe", "saipe.child_pov_rate"], opportunity: "agreement",
    compute: (m) => agreementOfRates(per(m, ["acs.kids_pov"], ["acs.kids_pov_universe"], 100), has(m, "saipe.child_pov_rate") ? v(m, "saipe.child_pov_rate") : null, 5),
  },
  {
    id: "J38", family: "validation", title: "Uninsured children: ACS survey vs SAHIE model",
    rationale: "Confirms the insurance picture used by the payer joins.",
    formula: "100 − 8 × |ACS under-19 uninsured % − SAHIE under-19 uninsured %|", unit: "agreement / 100",
    metrics: ["acs.u19_uninsured", "acs.u19", "sahie.u19_uninsured_rate"], opportunity: "agreement",
    compute: (m) => agreementOfRates(per(m, ["acs.u19_uninsured"], ["acs.u19"], 100), has(m, "sahie.u19_uninsured_rate") ? v(m, "sahie.u19_uninsured_rate") : null, 8),
  },
  {
    id: "J39", family: "validation", title: "Child population: ACS survey vs SAHIE model",
    rationale: "Confirms the child-population denominator used by almost every other join.",
    formula: "100 − 200 × |ACS under-19 ÷ SAHIE (insured + uninsured under-19) − 1|", unit: "agreement / 100",
    metrics: ["acs.u19", "sahie.u19_insured", "sahie.u19_uninsured"], opportunity: "agreement",
    compute: (m) => {
      const ratio = per(m, ["acs.u19"], ["sahie.u19_insured", "sahie.u19_uninsured"]);
      return ratio === null ? null : Math.max(0, Math.round(100 - Math.abs(ratio - 1) * 200));
    },
  },
  {
    id: "J40", family: "validation", title: "Child-care supply: business register vs state licensing",
    rationale: "Employer child-care centers (CBP) and licensed sites (state) should rank counties similarly.",
    formula: "100 − |state percentile of CBP 624410 per young child − state percentile of licensed sites per young child|",
    unit: "agreement / 100", metrics: ["cbp.daycare", "lic.childcare_sites", "acs.kids_u6"], opportunity: "agreement",
    compute: (m, ctx) => rankAgreement(m, ctx, (x) => per(x, ["cbp.daycare"], ["acs.kids_u6"], 1_000), (x) => per(x, ["lic.childcare_sites"], ["acs.kids_u6"], 1_000)),
  },

  // =========================================================================================
  // J41–J90: keyless joins. NPPES (ABA-specific taxonomy), OpenStreetMap, ACS via Census Reporter,
  // TIGER, HRSA and state licensing. These run without a Census API key.
  // =========================================================================================

  // --- Service gap: ABA-specific supply from the NPPES Behavior Analyst taxonomy ---------------
  {
    id: "J41", family: "service_gap", title: "ABA organizations per 10,000 children",
    rationale: "Registered ABA organizations (NPPES Behavior Analyst taxonomy) per child is the most direct supply measure.",
    formula: "NPPES Behavior Analyst organizations ÷ ACS children × 10,000", unit: "ABA orgs / 10k children",
    metrics: [ABA, "acs.kids"], opportunity: "lower", indicator: { id: "aba-supply.01", value: "supply" },
    compute: (m) => abaPer10k(m),
  },
  {
    id: "J42", family: "service_gap", title: "ABA organizations per 10,000 children ages 0–5",
    rationale: "Early-intervention-age demand against ABA-specific supply.",
    formula: "NPPES ABA organizations ÷ ACS children under 6 × 10,000", unit: "ABA orgs / 10k young children",
    metrics: [ABA, "acs.kids_u6"], opportunity: "lower",
    compute: (m) => per(m, [ABA], ["acs.kids_u6"], 10_000),
  },
  {
    id: "J43", family: "service_gap", title: "Children with a disability per ABA organization",
    rationale: "Aggregate disability counts per ABA provider approximate the caseload each provider would face.",
    formula: "ACS B18101 children with a disability ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: [...disabledKids, ABA], opportunity: "higher",
    compute: (m) => perAba(m, disabledKids),
  },
  {
    id: "J44", family: "service_gap", title: "Children 5–17 with cognitive difficulty per ABA organization",
    rationale: "Developmental need per ABA provider.",
    formula: "ACS B18104 cognitive difficulty 5–17 ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.cog_5to17", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["acs.cog_5to17"]),
  },
  {
    id: "J45", family: "service_gap", title: "Medicaid-covered children per ABA organization",
    rationale: "Medicaid ABA demand per provider; MO HealthNet, KanCare and Health First Colorado cover ABA.",
    formula: "ACS under-19 Medicaid/means-tested only ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.u19_medicaid", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["acs.u19_medicaid"]),
  },
  {
    id: "J46", family: "service_gap", title: "Employer-insured children per ABA organization",
    rationale: "Commercial (autism-mandate) demand per ABA provider.",
    formula: "ACS under-19 employer-only ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.u19_employer", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["acs.u19_employer"]),
  },
  {
    id: "J47", family: "service_gap", title: "Children in poverty per ABA organization",
    rationale: "Low-income children are likely Medicaid-eligible for ABA.",
    formula: "ACS B17020 children below poverty ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.kids_pov", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["acs.kids_pov"]),
  },
  {
    id: "J48", family: "service_gap", title: "Child-population growth × children per ABA organization",
    rationale: "A growing child population makes an ABA gap durable.",
    formula: "(1 + ACS under-18 change since 2015–19) × ACS children ÷ (NPPES ABA organizations + 1)", unit: "growth-weighted children / ABA org",
    metrics: ["acs.kids", "acs.kids_prior", ABA], opportunity: "higher",
    compute: (m) => {
      const gap = perAba(m, ["acs.kids"]);
      if (gap === null || !has(m, "acs.kids_prior") || v(m, "acs.kids_prior") <= 0) return null;
      return Math.max(0, 1 + (v(m, "acs.kids") - v(m, "acs.kids_prior")) / v(m, "acs.kids_prior")) * gap;
    },
  },
  {
    id: "J49", family: "service_gap", title: "Federal mental-health shortage × children per ABA organization",
    rationale: "HRSA's shortage designation independently corroborates the registry-based ABA gap.",
    formula: "HRSA Mental Health HPSA score × ACS children ÷ (NPPES ABA organizations + 1)", unit: "score-weighted children / ABA org",
    metrics: ["hrsa.mh_hpsa_score", "acs.kids", ABA], opportunity: "higher", indicator: { id: "aba-supply.06", value: "supply" },
    compute: (m) => {
      const gap = perAba(m, ["acs.kids"]);
      return gap === null || !has(m, "hrsa.mh_hpsa_score") ? null : v(m, "hrsa.mh_hpsa_score") * gap;
    },
  },
  {
    id: "J50", family: "service_gap", title: "Miles to the nearest county with typical ABA supply",
    rationale: "How far families travel to reach a county with at least the state-median ABA supply.",
    formula: "TIGER centroid distance to nearest county at or above the state median of NPPES ABA orgs per ACS child; 0 if this county qualifies",
    unit: "miles", metrics: ["tiger.lat", "tiger.lon", ABA, "acs.kids"], opportunity: "higher", indicator: { id: "aba-supply.08", value: "supply" },
    compute: (m, ctx) => nearestAdequate(m, ctx, abaPer10k),
  },
  {
    id: "J51", family: "service_gap", title: "Square miles per ABA organization",
    rationale: "Large service areas per ABA provider mark rural families with few options.",
    formula: "TIGER land area ÷ (NPPES ABA organizations + 1)", unit: "sq mi / ABA org",
    metrics: ["tiger.land_sqmi", ABA], opportunity: "higher", indicator: { id: "access-geography.06", value: "opportunity" },
    compute: (m) => perAba(m, ["tiger.land_sqmi"]),
  },
  {
    id: "J52", family: "service_gap", title: "Car-free households × children per ABA organization",
    rationale: "Families without cars depend on in-home ABA where providers are scarce.",
    formula: "ACS no-vehicle household share × ACS children ÷ (NPPES ABA organizations + 1)", unit: "index",
    metrics: ["acs.hh_no_vehicle", "acs.hh_vehicle_universe", "acs.kids", ABA], opportunity: "higher", indicator: { id: "access-geography.07", value: "opportunity" },
    compute: (m) => product(share(m, "acs.hh_no_vehicle", "acs.hh_vehicle_universe"), perAba(m, ["acs.kids"])),
  },
  {
    id: "J53", family: "service_gap", title: "Average commute × children per ABA organization",
    rationale: "Long commutes leave little time for clinic visits, favoring in-home ABA.",
    formula: "ACS mean travel time to work × ACS children ÷ (NPPES ABA organizations + 1) ÷ 100", unit: "index",
    metrics: ["acs.commute_minutes", "acs.commuters", "acs.kids", ABA], opportunity: "higher",
    compute: (m) => { const p = product(per(m, ["acs.commute_minutes"], ["acs.commuters"]), perAba(m, ["acs.kids"])); return p === null ? null : p / 100; },
  },
  {
    id: "J54", family: "service_gap", title: "Limited-English households × children per ABA organization",
    rationale: "Language-access gaps where ABA supply is thin favor bilingual intake.",
    formula: "ACS limited-English household share × ACS children ÷ (NPPES ABA organizations + 1)", unit: "index",
    metrics: ["acs.lep_hh", "acs.lep_universe", "acs.kids", ABA], opportunity: "higher",
    compute: (m) => product(share(m, "acs.lep_hh", "acs.lep_universe"), perAba(m, ["acs.kids"])),
  },
  {
    id: "J55", family: "service_gap", title: "Telehealth fit × square miles per ABA organization",
    rationale: "Connected households in large, thinly served areas suit telehealth parent training.",
    formula: "ACS internet share × TIGER sq mi ÷ (NPPES ABA organizations + 1)", unit: "index",
    metrics: ["acs.hh_no_internet", "acs.hh_internet_universe", "tiger.land_sqmi", ABA], opportunity: "higher",
    compute: (m) => { const offline = share(m, "acs.hh_no_internet", "acs.hh_internet_universe"); return offline === null ? null : product(1 - offline, perAba(m, ["tiger.land_sqmi"])); },
  },
  {
    id: "J56", family: "service_gap", title: "Statistically expected autistic children (3–17) per ABA organization",
    rationale: "CDC's 1-in-31 prevalence applied to the county's children, per ABA provider. An expectation, not identified children.",
    formula: "ACS children 3–17 × CDC ADDM 32.2 / 1,000 ÷ (NPPES ABA organizations + 1)", unit: "expected children / ABA org",
    metrics: ["acs.kids_3to5", "acs.kids_6to17", ABA], opportunity: "higher",
    compute: (m) => { const p = perAba(m, ["acs.kids_3to5", "acs.kids_6to17"]); return p === null ? null : p * CDC_PREVALENCE; },
  },
  {
    id: "J57", family: "service_gap", title: "Children per developmental-behavioral pediatrician",
    rationale: "Diagnostic bottleneck: autism diagnoses that unlock ABA coverage often need this specialist.",
    formula: "ACS children ÷ (NPPES Developmental-Behavioral Pediatrics clinicians + 1)", unit: "children / specialist",
    metrics: ["acs.kids", "nppes.dev_peds"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.kids"], ["nppes.dev_peds"]),
  },
  {
    id: "J58", family: "service_gap", title: "Children per child & adolescent psychologist",
    rationale: "Psychologists provide many autism evaluations; scarcity delays diagnosis and ABA starts.",
    formula: "ACS children ÷ (NPPES Clinical Child & Adolescent psychologists + 1)", unit: "children / psychologist",
    metrics: ["acs.kids", "nppes.child_psych"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.kids"], ["nppes.child_psych"]),
  },
  {
    id: "J59", family: "service_gap", title: "Children with a disability per speech-language organization",
    rationale: "Speech-therapy bottlenecks push families toward other developmental services.",
    formula: "ACS children with a disability ÷ (NPPES Speech-Language Pathologist organizations + 1)", unit: "children / org",
    metrics: [...disabledKids, "nppes.slp_orgs"], opportunity: "higher",
    compute: (m) => perPractice(m, disabledKids, ["nppes.slp_orgs"]),
  },
  {
    id: "J60", family: "service_gap", title: "Children under 5 with a disability per occupational-therapy organization",
    rationale: "Early-intervention-age need against the OT practices that often see these children first.",
    formula: "ACS children under 5 with a disability ÷ (NPPES Occupational Therapist organizations + 1)", unit: "children / org",
    metrics: ["acs.dis_u5", "nppes.ot_orgs"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.dis_u5"], ["nppes.ot_orgs"]),
  },

  // --- Referral network ---------------------------------------------------------------------
  {
    id: "J61", family: "referral_network", title: "Pediatric organizations per 10,000 children",
    rationale: "Pediatric practices screen for autism and refer to ABA.",
    formula: "NPPES Pediatrics organizations ÷ ACS children × 10,000", unit: "orgs / 10k children",
    metrics: ["nppes.ped_orgs", "acs.kids"], opportunity: "higher", indicator: { id: "referral-ecosystem.01", value: "opportunity" },
    compute: (m) => per(m, ["nppes.ped_orgs"], ["acs.kids"], 10_000),
  },
  {
    id: "J62", family: "referral_network", title: "Pediatric organizations per ABA organization",
    rationale: "More pediatric referrers per competing ABA provider means more referral flow per provider.",
    formula: "NPPES Pediatrics organizations ÷ (NPPES ABA organizations + 1)", unit: "pediatric orgs / ABA org",
    metrics: ["nppes.ped_orgs", ABA, "acs.kids"], opportunity: "higher",
    compute: (m) => has(m, "acs.kids") ? perAba(m, ["nppes.ped_orgs"]) : null,
  },
  {
    id: "J63", family: "referral_network", title: "Speech and OT organizations per ABA organization",
    rationale: "Related-service practices refer children for behavioral evaluation.",
    formula: "(NPPES SLP + OT organizations) ÷ (NPPES ABA organizations + 1), counties with ACS children only", unit: "orgs / ABA org",
    metrics: ["nppes.slp_orgs", "nppes.ot_orgs", ABA, "acs.kids"], opportunity: "higher",
    compute: (m) => has(m, "acs.kids") ? perAba(m, ["nppes.slp_orgs", "nppes.ot_orgs"]) : null,
  },
  {
    id: "J64", family: "referral_network", title: "Mapped child-care facilities per 1,000 children 0–5",
    rationale: "A second, independent view of the early-childhood network (works in Kansas too).",
    formula: "OpenStreetMap child care + kindergartens ÷ ACS children under 6 × 1,000", unit: "facilities / 1k young children",
    metrics: ["osm.childcare", "acs.kids_u6"], opportunity: "higher", indicator: { id: "referral-ecosystem.08", value: "opportunity" },
    compute: (m) => per(m, ["osm.childcare"], ["acs.kids_u6"], 1_000),
  },
  {
    id: "J65", family: "referral_network", title: "Schools per 10,000 school-age children",
    rationale: "Schools and their special-education teams refer families for outside services.",
    formula: "OpenStreetMap schools ÷ ACS children 6–17 × 10,000", unit: "schools / 10k school-age children",
    metrics: ["osm.schools", "acs.kids_6to17"], opportunity: "higher",
    compute: (m) => per(m, ["osm.schools"], ["acs.kids_6to17"], 10_000),
  },
  {
    id: "J66", family: "referral_network", title: "Pediatric and children's clinics per 10,000 children",
    rationale: "Named pediatric clinics on the community map, independent of the provider registry.",
    formula: "OpenStreetMap pediatric / children's clinics ÷ ACS children × 10,000", unit: "clinics / 10k children",
    metrics: ["osm.pediatrics", "acs.kids"], opportunity: "higher",
    compute: (m) => per(m, ["osm.pediatrics"], ["acs.kids"], 10_000),
  },
  {
    id: "J67", family: "referral_network", title: "Hospitals per 100,000 children",
    rationale: "Hospital pediatric departments anchor diagnostic referral pathways.",
    formula: "OpenStreetMap hospitals ÷ ACS children × 100,000", unit: "hospitals / 100k children",
    metrics: ["osm.hospitals", "acs.kids"], opportunity: "higher", indicator: { id: "access-geography.08", value: "opportunity" },
    compute: (m) => per(m, ["osm.hospitals"], ["acs.kids"], 100_000),
  },
  {
    id: "J68", family: "referral_network", title: "Licensed child-care sites per ABA organization",
    rationale: "Early-childhood referral partners available to each competing ABA provider.",
    formula: "State licensed child-care sites ÷ (NPPES ABA organizations + 1)", unit: "sites / ABA org",
    metrics: ["lic.childcare_sites", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["lic.childcare_sites"]),
  },
  {
    id: "J69", family: "referral_network", title: "Licensed child-care slots per ABA organization",
    rationale: "Children in licensed care per ABA provider: the pool child-care partners can refer from.",
    formula: "State licensed capacity ÷ (NPPES ABA organizations + 1)", unit: "slots / ABA org",
    metrics: ["lic.childcare_capacity", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["lic.childcare_capacity"]),
  },
  {
    id: "J70", family: "referral_network", title: "All referral touchpoints per ABA organization",
    rationale: "Pediatric, speech, OT and mapped child-care referrers combined, per competing ABA provider.",
    formula: "(NPPES pediatric + SLP + OT organizations + OpenStreetMap child care) ÷ (NPPES ABA organizations + 1)", unit: "touchpoints / ABA org",
    metrics: ["nppes.ped_orgs", "nppes.slp_orgs", "nppes.ot_orgs", "osm.childcare", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["nppes.ped_orgs", "nppes.slp_orgs", "nppes.ot_orgs", "osm.childcare"]),
  },
  {
    id: "J71", family: "referral_network", title: "Diagnostic clinicians per 10,000 children",
    rationale: "Developmental pediatricians and child psychologists produce the diagnoses that start ABA referrals.",
    formula: "(NPPES Developmental-Behavioral Pediatrics + Clinical Child & Adolescent) ÷ ACS children × 10,000", unit: "clinicians / 10k children",
    metrics: ["nppes.dev_peds", "nppes.child_psych", "acs.kids"], opportunity: "higher", indicator: { id: "referral-ecosystem.04", value: "opportunity" },
    compute: (m) => per(m, ["nppes.dev_peds", "nppes.child_psych"], ["acs.kids"], 10_000),
  },
  {
    id: "J72", family: "referral_network", title: "Schools per ABA organization",
    rationale: "School referral sources available to each competing ABA provider.",
    formula: "OpenStreetMap schools ÷ (NPPES ABA organizations + 1)", unit: "schools / ABA org",
    metrics: ["osm.schools", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["osm.schools"]),
  },

  // --- Payer and family economics -------------------------------------------------------------
  {
    id: "J73", family: "payer_fit", title: "Insured children (employer + Medicaid) per ABA organization",
    rationale: "Billable children per ABA provider across both major payer types.",
    formula: "ACS under-19 employer-only + Medicaid-only ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.u19_employer", "acs.u19_medicaid", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["acs.u19_employer", "acs.u19_medicaid"]),
  },
  {
    id: "J74", family: "payer_fit", title: "Employer-insured children 0–5 per ABA organization",
    rationale: "Young children on commercial plans are the highest-value early-intervention referrals.",
    formula: "ACS children under 6 × employer-only share ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.kids_u6", "acs.u19_employer", "acs.u19", ABA], opportunity: "higher",
    compute: (m) => product(share(m, "acs.u19_employer", "acs.u19"), perAba(m, ["acs.kids_u6"])),
  },
  {
    id: "J75", family: "payer_fit", title: "Medicaid-covered children 0–5 per ABA organization",
    rationale: "Young children on Medicaid, where EPSDT requires medically necessary ABA.",
    formula: "ACS children under 6 × Medicaid-only share ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.kids_u6", "acs.u19_medicaid", "acs.u19", ABA], opportunity: "higher",
    compute: (m) => product(share(m, "acs.u19_medicaid", "acs.u19"), perAba(m, ["acs.kids_u6"])),
  },
  {
    id: "J76", family: "payer_fit", title: "Working-parent children 0–5 per ABA organization",
    rationale: "Working families need center-based or scheduled ABA that fits their workday.",
    formula: "ACS B23008 children under 6 with all parents working ÷ (NPPES ABA organizations + 1)", unit: "children / ABA org",
    metrics: ["acs.u6_working_parents", ABA], opportunity: "higher",
    compute: (m) => perAba(m, ["acs.u6_working_parents"]),
  },
  {
    id: "J77", family: "payer_fit", title: "Income-adjusted families with children per ABA organization",
    rationale: "Families with children, weighted by how their income compares with the county, per ABA provider.",
    formula: "ACS households with children × (ACS family income with children ÷ ACS median household income) ÷ (NPPES ABA organizations + 1)", unit: "index",
    metrics: ["acs.hh_kids", "acs.mfi_kids", "acs.mhi", ABA], opportunity: "higher",
    compute: (m) => product(per(m, ["acs.mfi_kids"], ["acs.mhi"]), perAba(m, ["acs.hh_kids"])),
  },

  // --- Access -----------------------------------------------------------------------------------
  {
    id: "J78", family: "access", title: "Dense child population with thin ABA supply",
    rationale: "Many children close together and few ABA providers: short drives, unmet demand.",
    formula: "(ACS children ÷ TIGER sq mi) ÷ (NPPES ABA orgs per 10k children + 1)", unit: "index",
    metrics: ["acs.kids", "tiger.land_sqmi", ABA], opportunity: "higher",
    compute: (m) => { const density = per(m, ["acs.kids"], ["tiger.land_sqmi"]); const supply = abaPer10k(m); return density === null || supply === null ? null : density / (supply + 1); },
  },
  {
    id: "J79", family: "access", title: "Rural shortage × square miles per ABA organization",
    rationale: "A federal shortage designation over a large, ABA-thin area.",
    formula: "HRSA Mental Health HPSA score × TIGER sq mi ÷ (NPPES ABA organizations + 1)", unit: "index",
    metrics: ["hrsa.mh_hpsa_score", "tiger.land_sqmi", ABA], opportunity: "higher",
    compute: (m) => has(m, "hrsa.mh_hpsa_score") ? product(v(m, "hrsa.mh_hpsa_score"), perAba(m, ["tiger.land_sqmi"])) : null,
  },
  {
    id: "J80", family: "access", title: "Licensed child-care sites per square mile",
    rationale: "Dense child-care networks make referral outreach routes efficient.",
    formula: "State licensed child-care sites ÷ TIGER sq mi", unit: "sites / sq mi",
    metrics: ["lic.childcare_sites", "tiger.land_sqmi"], opportunity: "higher",
    compute: (m) => per(m, ["lic.childcare_sites"], ["tiger.land_sqmi"]),
  },

  // --- Need intensity ---------------------------------------------------------------------------
  {
    id: "J81", family: "need_intensity", title: "Children with a disability per diagnostic clinician",
    rationale: "Developmental need against the clinicians who diagnose autism.",
    formula: "ACS children with a disability ÷ (NPPES developmental pediatricians + child psychologists + 1)", unit: "children / clinician",
    metrics: [...disabledKids, "nppes.dev_peds", "nppes.child_psych"], opportunity: "higher",
    compute: (m) => perPractice(m, disabledKids, ["nppes.dev_peds", "nppes.child_psych"]),
  },
  {
    id: "J82", family: "need_intensity", title: "Children under 5 with a disability per pediatric organization",
    rationale: "Early need against the practices that run developmental screening.",
    formula: "ACS children under 5 with a disability ÷ (NPPES Pediatrics organizations + 1)", unit: "children / org",
    metrics: ["acs.dis_u5", "nppes.ped_orgs"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.dis_u5"], ["nppes.ped_orgs"]),
  },
  {
    id: "J83", family: "need_intensity", title: "Children with cognitive difficulty per child psychologist",
    rationale: "Cognitive need against evaluation capacity.",
    formula: "ACS B18104 cognitive difficulty 5–17 ÷ (NPPES child & adolescent psychologists + 1)", unit: "children / psychologist",
    metrics: ["acs.cog_5to17", "nppes.child_psych"], opportunity: "higher",
    compute: (m) => perPractice(m, ["acs.cog_5to17"], ["nppes.child_psych"]),
  },
  {
    id: "J84", family: "need_intensity", title: "Statistically expected autistic children per diagnostic clinician",
    rationale: "CDC prevalence applied to the county's children, per diagnostic clinician. An expectation, not identified children.",
    formula: "ACS children 3–17 × CDC ADDM 32.2 / 1,000 ÷ (NPPES developmental pediatricians + child psychologists + 1)", unit: "expected children / clinician",
    metrics: ["acs.kids_3to5", "acs.kids_6to17", "nppes.dev_peds", "nppes.child_psych"], opportunity: "higher",
    compute: (m) => { const p = perPractice(m, ["acs.kids_3to5", "acs.kids_6to17"], ["nppes.dev_peds", "nppes.child_psych"]); return p === null ? null : p * CDC_PREVALENCE; },
  },

  // --- Cross-source validation (rank agreement 0–100) -----------------------------------------
  {
    id: "J85", family: "validation", title: "Child care: OpenStreetMap vs state licensing",
    rationale: "Community-mapped and state-licensed child care should rank counties similarly.",
    formula: "100 − |state percentile of OSM child care per young child − state percentile of licensed sites per young child|",
    unit: "agreement / 100", metrics: ["osm.childcare", "lic.childcare_sites", "acs.kids_u6"], opportunity: "agreement",
    compute: (m, ctx) => rankAgreement(m, ctx, (x) => per(x, ["osm.childcare"], ["acs.kids_u6"], 1_000), (x) => per(x, ["lic.childcare_sites"], ["acs.kids_u6"], 1_000)),
  },
  {
    id: "J86", family: "validation", title: "ABA supply: provider registry vs community map",
    rationale: "NPPES ABA organizations and ABA-named mapped facilities should agree on where supply is.",
    formula: "100 − |state percentile of NPPES ABA orgs per child − state percentile of OSM ABA-named facilities per child|",
    unit: "agreement / 100", metrics: [ABA, "osm.aba_named", "acs.kids"], opportunity: "agreement",
    compute: (m, ctx) => rankAgreement(m, ctx, abaPer10k, (x) => per(x, ["osm.aba_named"], ["acs.kids"], 10_000)),
  },
  {
    id: "J87", family: "validation", title: "Pediatric supply: provider registry vs community map",
    rationale: "NPPES pediatric organizations and mapped pediatric clinics should agree.",
    formula: "100 − |state percentile of NPPES pediatric orgs per child − state percentile of OSM pediatric clinics per child|",
    unit: "agreement / 100", metrics: ["nppes.ped_orgs", "osm.pediatrics", "acs.kids"], opportunity: "agreement",
    compute: (m, ctx) => rankAgreement(m, ctx, (x) => per(x, ["nppes.ped_orgs"], ["acs.kids"], 10_000), (x) => per(x, ["osm.pediatrics"], ["acs.kids"], 10_000)),
  },
  {
    id: "J88", family: "validation", title: "Behavioral supply: provider registry vs business register",
    rationale: "NPPES ABA organizations vs CBP mental-health practices (runs when a Census API key is configured).",
    formula: "100 − |state percentile of NPPES ABA orgs per child − state percentile of CBP 621330 per child|",
    unit: "agreement / 100", metrics: [ABA, "cbp.mh_practices", "acs.kids"], opportunity: "agreement",
    compute: (m, ctx) => rankAgreement(m, ctx, abaPer10k, behavioralPer10k),
  },
  {
    id: "J89", family: "validation", title: "Hospitals: community map vs business register",
    rationale: "Mapped hospitals vs CBP general hospitals (runs when a Census API key is configured).",
    formula: "100 − |state percentile of OSM hospitals per child − state percentile of CBP 622110 per child|",
    unit: "agreement / 100", metrics: ["osm.hospitals", "cbp.hospitals", "acs.kids"], opportunity: "agreement",
    compute: (m, ctx) => rankAgreement(m, ctx, (x) => per(x, ["osm.hospitals"], ["acs.kids"], 100_000), (x) => per(x, ["cbp.hospitals"], ["acs.kids"], 100_000)),
  },
  {
    id: "J90", family: "validation", title: "Speech/OT supply: provider registry vs community map",
    rationale: "NPPES speech and OT organizations vs mapped therapy offices.",
    formula: "100 − |state percentile of NPPES SLP + OT orgs per child − state percentile of OSM therapy offices per child|",
    unit: "agreement / 100", metrics: ["nppes.slp_orgs", "nppes.ot_orgs", "osm.therapy", "acs.kids"], opportunity: "agreement",
    compute: (m, ctx) => rankAgreement(m, ctx, (x) => per(x, ["nppes.slp_orgs", "nppes.ot_orgs"], ["acs.kids"], 10_000), (x) => per(x, ["osm.therapy"], ["acs.kids"], 10_000)),
  },
];

export function joinPrograms(join: JoinDefinition): ProgramId[] {
  return [...new Set(join.metrics.map(metricProgram))];
}
