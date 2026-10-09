import type { CountyFrame } from "../joins/collectors";
import type { CountyJoinReport } from "../joins/rank";
import type { MetricId } from "../joins/sources";
import { haversineMiles, SITE_RADII_MILES, type LatLon } from "./geo-math";
import type { MapPlace, SitePlaces, ZipProviderCount } from "./places";
import type { TractFrame } from "./tracts";

/**
 * CDC ADDM Network, surveillance year 2022 (MMWR 2025): 32.2 per 1,000 children aged 8 (about 1 in 31).
 * Used ONLY for statistical expectations over area populations or licensed capacity. It never identifies a child.
 */
export const CDC_AUTISM_PREVALENCE = 32.2 / 1000;
export const CDC_PREVALENCE_SOURCE = "https://www.cdc.gov/mmwr/volumes/74/ss/ss7402a1.htm";

export type IndicatorFamily =
  | "child_demand" | "developmental_need" | "payer" | "household_access" | "supply" | "referral" | "child_care"
  | "geography" | "expected" | "county_context";

export const INDICATOR_FAMILY_TITLES: Record<IndicatorFamily, string> = {
  child_demand: "Children and families",
  developmental_need: "Developmental need (aggregate)",
  payer: "Insurance and income",
  household_access: "Household access barriers",
  supply: "ABA and clinical supply",
  referral: "Referral sources",
  child_care: "Child care",
  geography: "Distance and concentration",
  expected: "Statistical expectations",
  county_context: "County context",
};

export interface SiteIndicator {
  id: string;
  family: IndicatorFamily;
  name: string;
  radiusMiles: number | null;
  value: number | null;
  unit: string;
  sources: string[];
  basis: string;
}

export type DaycareTier = "priority" | "confirmed" | "likely";
export interface DaycareAssessment {
  place: MapPlace;
  tier: DaycareTier;
  confirmedBy: number;
  servesTargetAges: boolean | null;
  reasons: string[];
  expectedAutisticAtCapacity: number | null;
  expectedWithDisabilityAtCapacity: number | null;
}

export interface ConvergenceTest {
  id: string;
  title: string;
  status: "pass" | "fail" | "insufficient";
  sources: string[];
  detail: string;
}

export interface SiteAnalysis {
  center: LatLon;
  countyFips: string | null;
  rings: Array<{ radiusMiles: number; children: number | null; childrenUnder6: number | null; withDisability: number | null; abaProviders: number; licensedDaycares: number; licensedCapacity: number; pediatricSources: number }>;
  indicators: SiteIndicator[];
  daycares: DaycareAssessment[];
  convergence: { tests: ConvergenceTest[]; passed: number; evaluated: number; strength: "strong" | "moderate" | "weak" | "insufficient" };
  hotspots: Array<{ geoid: string; lat: number; lon: number; distanceMiles: number; childrenUnder6: number; disabilityRate: number | null }>;
  notes: string[];
}

type Sums = Partial<Record<MetricId | "land", number>>;
const SUM_METRICS: MetricId[] = [
  "acs.pop", "acs.kids", "acs.kids_u3", "acs.kids_3to5", "acs.kids_u6", "acs.kids_6to11", "acs.kids_12to17", "acs.kids_6to17",
  "acs.hh", "acs.hh_kids", "acs.u19", "acs.u19_employer", "acs.u19_medicaid", "acs.u19_uninsured", "acs.kids_pov", "acs.kids_pov_universe",
  "acs.dis_u5", "acs.dis_u5_universe", "acs.dis_5to17", "acs.dis_5to17_universe", "acs.cog_5to17", "acs.cog_universe",
  "acs.hh_no_internet", "acs.hh_internet_universe", "acs.hh_no_vehicle", "acs.hh_vehicle_universe", "acs.lep_hh", "acs.lep_universe",
  "acs.u6_working_parents", "acs.u6_parent_universe",
];

/**
 * Fraction of a tract inside a circle, treating the tract as a disc of equal land area.
 * Keeps small radii (2 miles) meaningful in rural areas where tract centroids are far apart.
 */
export function tractWeight(distance: number, radius: number, landSqmi: number): number {
  const rt = Math.sqrt(Math.max(landSqmi, 0.05) / Math.PI);
  if (rt <= radius) {
    if (distance <= radius - rt) return 1;
    if (distance >= radius + rt) return 0;
    return (radius + rt - distance) / (2 * rt);
  }
  // Tract larger than the circle: at most the circle's share of the tract's area.
  const full = (radius * radius) / (rt * rt);
  if (distance <= rt - radius) return full;
  if (distance >= rt + radius) return 0;
  return full * (rt + radius - distance) / (2 * radius);
}

export function sumTracts(tracts: readonly TractFrame[], center: LatLon, radius: number): Sums {
  const sums: Sums = {};
  for (const tract of tracts) {
    const weight = tractWeight(haversineMiles(center, tract), radius, tract.landSqmi);
    if (weight <= 0) continue;
    sums.land = (sums.land ?? 0) + weight * tract.landSqmi;
    for (const metric of SUM_METRICS) {
      const value = tract.metrics[metric];
      if (value !== undefined) sums[metric] = (sums[metric] ?? 0) + weight * value;
    }
  }
  return sums;
}

const div = (a: number | undefined | null, b: number | undefined | null, scale = 1) =>
  a === undefined || a === null || b === undefined || b === null || b <= 0 ? null : (a / b) * scale;
const add = (...values: Array<number | undefined>) => values.some((value) => value === undefined) ? undefined : values.reduce<number>((s, v) => s + v!, 0);
/** Detail-string formatting: missing values read "—", never "null". */
const show = (value: number | null | undefined, scale = 1) => value === null || value === undefined ? "—" : String(round(value * scale));
const round = (value: number | null) => value === null ? null : Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 100) / 100;

/** 0.12 -> "6 wks", 2 -> "2 yrs", 2.5 -> "2.5 yrs". */
export function formatAgeYears(value: number): string {
  if (value < 1) return `${Math.max(1, Math.round(value * 52))} wks`;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} yrs`;
}
export const formatAgeRange = (min: number, max: number) => `${formatAgeYears(min)}–${formatAgeYears(max)}`;

export function servesAges(place: MapPlace, min: number, max: number): boolean | null {
  if (place.minAgeYears == null || place.maxAgeYears == null || !Number.isFinite(place.minAgeYears) || !Number.isFinite(place.maxAgeYears)) return null;
  return place.minAgeYears <= max && place.maxAgeYears >= min;
}

export function assessDaycare(place: MapPlace, underFiveDisabilityRate: number | null): DaycareAssessment {
  const confirmedBy = new Set(place.sources.filter((source) => source !== "organization-website")).size;
  const servesTargetAges = servesAges(place, 2, 5);
  const reasons: string[] = [];
  if (place.licensed) reasons.push("State-licensed child-care facility: children are enrolled by definition" + (place.capacity ? ` (licensed for ${place.capacity})` : ""));
  else reasons.push("Listed as child care on OpenStreetMap only; licensing not confirmed");
  if (confirmedBy >= 2) reasons.push(`Confirmed by ${confirmedBy} independent sources (${place.sources.filter((s) => s !== "organization-website").join(", ")})`);
  if (servesTargetAges === true) reasons.push(`Licensed ages ${formatAgeRange(place.minAgeYears!, place.maxAgeYears!)} overlap the 2–5 early-intervention window`);
  if (servesTargetAges === false) reasons.push(`Licensed ages ${formatAgeRange(place.minAgeYears!, place.maxAgeYears!)} do not include ages 2–5`);
  if (place.schoolDistrictOperated) reasons.push("School-district operated program: districts serve preschoolers with IEPs");
  if (place.inclusionSignals.length) reasons.push("Inclusion / special-needs language: " + place.inclusionSignals.join(", "));
  const tier: DaycareTier = !place.licensed ? "likely"
    : place.inclusionSignals.length > 0 && servesTargetAges !== false ? "priority" : "confirmed";
  return {
    place, tier, confirmedBy, servesTargetAges, reasons,
    expectedAutisticAtCapacity: place.capacity ? Math.round(place.capacity * CDC_AUTISM_PREVALENCE * 10) / 10 : null,
    expectedWithDisabilityAtCapacity: place.capacity && underFiveDisabilityRate !== null ? Math.round(place.capacity * underFiveDisabilityRate * 10) / 10 : null,
  };
}

export interface SiteContext {
  tracts: readonly TractFrame[];
  places: SitePlaces;
  /** Counties of the state (for SAIPE/SAHIE/HRSA context and baselines). */
  counties?: readonly CountyFrame[];
  countyReports?: readonly CountyJoinReport[];
}

const cbpPer10k = (frame: CountyFrame) => div(frame.metrics["cbp.mh_practices"], frame.metrics["acs.kids"], 10_000);
const nppesAbaPer10k = (frame: CountyFrame) => div(frame.metrics["nppes.aba_orgs"], frame.metrics["acs.kids"], 10_000);
const osmAbaPer10k = (frame: CountyFrame) => div(frame.metrics["osm.aba_named"], frame.metrics["acs.kids"], 10_000);
const acsCountyRate = (frame: CountyFrame | undefined, part: MetricId, whole: MetricId) => frame ? div(frame.metrics[part], frame.metrics[whole], 100) : null;

function stateBaselines(ctx: SiteContext) {
  const totals: Sums = {};
  const densities: number[] = [];
  for (const tract of ctx.tracts) {
    for (const metric of SUM_METRICS) {
      const value = tract.metrics[metric];
      if (value !== undefined) totals[metric] = (totals[metric] ?? 0) + value;
    }
    totals.land = (totals.land ?? 0) + tract.landSqmi;
    if (tract.landSqmi > 0 && tract.metrics["acs.kids"] !== undefined) densities.push(tract.metrics["acs.kids"]! / tract.landSqmi);
  }
  densities.sort((a, b) => a - b);
  const sahie = (ctx.counties ?? []).map((county) => county.metrics["sahie.u19_uninsured_rate"]).filter((v): v is number => v !== undefined).sort((a, b) => a - b);
  const rates = (fn: (frame: CountyFrame) => number | null) => (ctx.counties ?? []).map(fn).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const cbpRates = rates(cbpPer10k);
  const nppesRates = rates(nppesAbaPer10k);
  const osmRates = rates(osmAbaPer10k);
  const median = (values: number[]) => values.length ? values[Math.floor(values.length / 2)] : null;
  return {
    youngDensity: div(totals["acs.kids_u6"], totals.land),
    medianTractChildDensity: median(densities),
    disabilityRate: div(add(totals["acs.dis_u5"], totals["acs.dis_5to17"]), add(totals["acs.dis_u5_universe"], totals["acs.dis_5to17_universe"])),
    insuredShare: div(add(totals["acs.u19_employer"], totals["acs.u19_medicaid"]), totals["acs.u19"]),
    medianSahieUninsured: median(sahie),
    medianCbpPer10k: median(cbpRates),
    medianNppesAbaPer10k: median(nppesRates),
    medianOsmAbaPer10k: median(osmRates),
  };
}

export function analyzeSite(center: LatLon, ctx: SiteContext): SiteAnalysis {
  const notes: string[] = [];
  const places = ctx.places.places.map((place) => ({ ...place, distanceMiles: place.distanceMiles ?? haversineMiles(center, place) }));
  const nearestTract = [...ctx.tracts].sort((a, b) => haversineMiles(center, a) - haversineMiles(center, b))[0];
  const countyFips = nearestTract?.countyFips ?? null;
  const county = ctx.counties?.find((frame) => frame.fips === countyFips);
  const countyReport = ctx.countyReports?.find((report) => report.fips === countyFips);
  const baseline = stateBaselines(ctx);

  const sums = new Map(SITE_RADII_MILES.map((radius) => [radius, sumTracts(ctx.tracts, center, radius)]));
  const within = (radius: number) => places.filter((place) => place.distanceMiles! <= radius);
  const zipsWithin = (radius: number): ZipProviderCount[] => ctx.places.zipCounts.filter((zip) => haversineMiles(center, zip) <= radius);
  const nppesAvailable = ctx.places.sources.some((source) => source.source.startsWith("CMS NPPES") && source.status === "complete");
  const rosterAvailable = ctx.places.sources.some((source) => /licensed child care/i.test(source.source) && source.status === "complete");
  const osmAvailable = ctx.places.sources.some((source) => source.source.startsWith("OpenStreetMap") && source.status === "complete");
  const supplyKnown = nppesAvailable || osmAvailable;
  const under5Rate = div(sums.get(2)!["acs.dis_u5"], sums.get(2)!["acs.dis_u5_universe"]) ?? div(sums.get(5)!["acs.dis_u5"], sums.get(5)!["acs.dis_u5_universe"]);

  const daycares = places.filter((place) => place.kind === "daycare").map((place) => assessDaycare(place, under5Rate))
    .sort((a, b) => ({ priority: 0, confirmed: 1, likely: 2 }[a.tier] - { priority: 0, confirmed: 1, likely: 2 }[b.tier]) ||
      ((b.place.capacity ?? 0) - (a.place.capacity ?? 0)) || (a.place.distanceMiles! - b.place.distanceMiles!));

  const ACS = ["census-acs5 (tracts, area-weighted)"];
  const TRACT = "Area-weighted census tracts";
  const indicators: SiteIndicator[] = [];
  const push = (family: IndicatorFamily, id: string, name: string, radius: number | null, value: number | null, unit: string, sources: string[], basis: string) =>
    indicators.push({ id, family, name, radiusMiles: radius, value: round(value), unit, sources, basis });

  for (const r of SITE_RADII_MILES) {
    const s = sums.get(r)!;
    const tag = (base: string) => `${base}.${r}mi`;
    // Children, families and need (ACS tract sums)
    const counts: Array<[IndicatorFamily, string, string, number | undefined]> = [
      ["child_demand", "children", "Children under 18", s["acs.kids"]],
      ["child_demand", "children_0_2", "Children 0–2", s["acs.kids_u3"]],
      ["child_demand", "children_3_5", "Children 3–5", s["acs.kids_3to5"]],
      ["child_demand", "children_0_5", "Children 0–5", s["acs.kids_u6"]],
      ["child_demand", "children_6_11", "Children 6–11", s["acs.kids_6to11"]],
      ["child_demand", "children_12_17", "Children 12–17", s["acs.kids_12to17"]],
      ["child_demand", "children_3_17", "Children 3–17 (core ABA ages)", add(s["acs.kids_3to5"], s["acs.kids_6to17"])],
      ["child_demand", "households_with_children", "Households with children", s["acs.hh_kids"]],
      ["child_demand", "population", "Total population", s["acs.pop"]],
      ["developmental_need", "disability_0_4", "Children under 5 with a disability", s["acs.dis_u5"]],
      ["developmental_need", "disability_5_17", "Children 5–17 with a disability", s["acs.dis_5to17"]],
      ["developmental_need", "cognitive_5_17", "Children 5–17 with cognitive difficulty", s["acs.cog_5to17"]],
      ["payer", "medicaid_children", "Children with Medicaid/means-tested coverage only", s["acs.u19_medicaid"]],
      ["payer", "employer_children", "Children with employer coverage only", s["acs.u19_employer"]],
      ["payer", "uninsured_children", "Uninsured children", s["acs.u19_uninsured"]],
      ["payer", "children_in_poverty", "Children below the poverty line", s["acs.kids_pov"]],
      ["household_access", "working_parent_0_5", "Children 0–5 with all parents working", s["acs.u6_working_parents"]],
      ["household_access", "limited_english_households", "Limited-English households", s["acs.lep_hh"]],
      ["household_access", "no_vehicle_households", "Households without a vehicle", s["acs.hh_no_vehicle"]],
      ["household_access", "no_internet_households", "Households without internet", s["acs.hh_no_internet"]],
    ];
    for (const [family, id, name, value] of counts) push(family, tag(id), name, r, value ?? null, "people / households", ACS, TRACT);

    const shares: Array<[IndicatorFamily, string, string, number | null, string]> = [
      ["child_demand", "child_share", "Children as share of population", div(s["acs.kids"], s["acs.pop"], 100), "%"],
      ["child_demand", "young_child_share", "Ages 0–5 as share of children", div(s["acs.kids_u6"], s["acs.kids"], 100), "%"],
      ["child_demand", "household_children_share", "Households with children", div(s["acs.hh_kids"], s["acs.hh"], 100), "%"],
      ["child_demand", "child_density", "Children per square mile", div(s["acs.kids"], s.land), "children / sq mi"],
      ["developmental_need", "child_disability_rate", "Child disability rate (0–17)", div(add(s["acs.dis_u5"], s["acs.dis_5to17"]), add(s["acs.dis_u5_universe"], s["acs.dis_5to17_universe"]), 100), "%"],
      ["developmental_need", "under5_disability_rate", "Disability rate, children under 5", div(s["acs.dis_u5"], s["acs.dis_u5_universe"], 100), "%"],
      ["developmental_need", "cognitive_rate", "Cognitive difficulty rate (5–17)", div(s["acs.cog_5to17"], s["acs.cog_universe"], 100), "%"],
      ["payer", "medicaid_share", "Medicaid-only share of children", div(s["acs.u19_medicaid"], s["acs.u19"], 100), "%"],
      ["payer", "employer_share", "Employer-only share of children", div(s["acs.u19_employer"], s["acs.u19"], 100), "%"],
      ["payer", "uninsured_rate", "Uninsured rate, children", div(s["acs.u19_uninsured"], s["acs.u19"], 100), "%"],
      ["payer", "child_poverty_rate", "Child poverty rate", div(s["acs.kids_pov"], s["acs.kids_pov_universe"], 100), "%"],
      ["household_access", "working_parent_share", "Children 0–5 with all parents working", div(s["acs.u6_working_parents"], s["acs.u6_parent_universe"], 100), "%"],
      ["household_access", "limited_english_share", "Limited-English households", div(s["acs.lep_hh"], s["acs.lep_universe"], 100), "%"],
      ["household_access", "no_vehicle_share", "Households without a vehicle", div(s["acs.hh_no_vehicle"], s["acs.hh_vehicle_universe"], 100), "%"],
      ["household_access", "no_internet_share", "Households without internet", div(s["acs.hh_no_internet"], s["acs.hh_internet_universe"], 100), "%"],
    ];
    for (const [family, id, name, value, unit] of shares) push(family, tag(id), name, r, value, unit, ACS, TRACT);

    // Places (organizations only) within the radius
    const inR = within(r);
    const count = (kind: MapPlace["kind"], filter: (place: MapPlace) => boolean = () => true) => inR.filter((place) => place.kind === kind && filter(place)).length;
    const aba = count("aba_provider");
    const zips = zipsWithin(r);
    const analysts = zips.reduce((sum, zip) => sum + zip.behaviorAnalysts, 0);
    const pedClinicians = zips.reduce((sum, zip) => sum + zip.pediatricClinicians, 0);
    const licensed = inR.filter((place) => place.kind === "daycare" && place.licensed);
    const capacity = licensed.reduce((sum, place) => sum + (place.capacity ?? 0), 0);
    const daycareInR = daycares.filter((item) => item.place.distanceMiles! <= r);
    const pointCounts: Array<[IndicatorFamily, string, string, number | null, string[], string]> = [
      ["supply", "aba_organizations", "ABA / behavior-analysis organizations", supplyKnown ? aba : null, ["cms-nppes", "openstreetmap"], "Organization NPIs (taxonomy Behavior Analyst) + ABA-named facilities"],
      ["supply", "behavior_analysts", "Individual behavior analysts (practice ZIP)", nppesAvailable ? analysts : null, ["cms-nppes"], "Counted by practice ZIP centroid; never pinned"],
      ["referral", "pediatric_organizations", "Pediatric practice organizations", supplyKnown ? count("pediatrics") : null, ["cms-nppes", "openstreetmap"], "Organization NPIs (Pediatrics) + pediatric facilities"],
      ["referral", "pediatric_clinicians", "Individual pediatric clinicians (practice ZIP)", nppesAvailable ? pedClinicians : null, ["cms-nppes"], "Counted by practice ZIP centroid; never pinned"],
      ["referral", "therapy_offices", "Speech / OT / PT offices", osmAvailable ? count("therapy") : null, ["openstreetmap"], "Facility tags"],
      ["referral", "schools", "Schools", osmAvailable ? count("school") : null, ["openstreetmap"], "Facility tags"],
      ["referral", "hospitals", "Hospitals", osmAvailable ? count("hospital") : null, ["openstreetmap"], "Facility tags"],
      ["child_care", "licensed_daycares", "Licensed child-care facilities", rosterAvailable ? licensed.length : null, ["state licensing"], "State roster"],
      ["child_care", "licensed_capacity", "Licensed child-care slots", rosterAvailable ? capacity : null, ["state licensing"], "Sum of licensed capacity"],
      ["child_care", "daycares_ages_2_5", "Licensed facilities serving ages 2–5", rosterAvailable ? daycareInR.filter((d) => d.place.licensed && d.servesTargetAges === true).length : null, ["state licensing"], "Licensed age range"],
      ["child_care", "priority_daycares", "Priority referral-partner child care", rosterAvailable || osmAvailable ? daycareInR.filter((d) => d.tier === "priority").length : null, ["state licensing", "organization websites"], "Licensed + inclusion/special-needs signal"],
      ["child_care", "unconfirmed_childcare", "Child-care listings not on the state roster", osmAvailable ? daycareInR.filter((d) => d.tier === "likely").length : null, ["openstreetmap"], "Unconfirmed listing"],
    ];
    for (const [family, id, name, value, sources, basis] of pointCounts) push(family, tag(id), name, r, value, "count", sources, basis);

    const supplyRatio = (people: number | undefined | null, providers: number) => supplyKnown && people != null ? people / (providers + 1) : null;
    const expectedAutistic = add(s["acs.kids_3to5"], s["acs.kids_6to17"]);
    const ratios: Array<[IndicatorFamily, string, string, number | null, string, string[]]> = [
      ["supply", "children_per_aba", "Children per ABA organization", supplyRatio(s["acs.kids"], aba), "children / org", ["acs", "nppes", "osm"]],
      ["supply", "young_children_per_aba", "Children 0–5 per ABA organization", supplyRatio(s["acs.kids_u6"], aba), "children / org", ["acs", "nppes", "osm"]],
      ["supply", "disability_per_aba", "Children with a disability per ABA organization", supplyRatio(add(s["acs.dis_u5"], s["acs.dis_5to17"]), aba), "children / org", ["acs", "nppes", "osm"]],
      ["supply", "medicaid_per_aba", "Medicaid-covered children per ABA organization", supplyRatio(s["acs.u19_medicaid"], aba), "children / org", ["acs", "nppes", "osm"]],
      ["supply", "employer_per_aba", "Employer-insured children per ABA organization", supplyRatio(s["acs.u19_employer"], aba), "children / org", ["acs", "nppes", "osm"]],
      ["supply", "children_per_analyst", "Children per behavior analyst", nppesAvailable && s["acs.kids"] !== undefined ? s["acs.kids"]! / (analysts + 1) : null, "children / analyst", ["acs", "nppes"]],
      ["supply", "expected_autistic_per_aba", "Statistically expected autistic children (3–17) per ABA organization", supplyRatio(expectedAutistic === undefined ? undefined : expectedAutistic * CDC_AUTISM_PREVALENCE, aba), "children / org", ["acs", "cdc-addm", "nppes"]],
      ["referral", "children_per_pediatric_clinician", "Children per pediatric clinician", nppesAvailable && s["acs.kids"] !== undefined ? s["acs.kids"]! / (pedClinicians + 1) : null, "children / clinician", ["acs", "nppes"]],
      ["referral", "pediatric_per_aba", "Pediatric clinicians per ABA organization (referral flow)", nppesAvailable ? pedClinicians / (aba + 1) : null, "clinicians / org", ["nppes", "osm"]],
      ["referral", "schools_per_aba", "Schools per ABA organization", osmAvailable ? count("school") / (aba + 1) : null, "schools / org", ["osm", "nppes"]],
      ["child_care", "slots_per_young_child", "Licensed slots per child 0–5", rosterAvailable ? div(capacity, s["acs.kids_u6"]) : null, "slots / child", ["state licensing", "acs"]],
      ["child_care", "working_children_per_slot", "Working-parent children 0–5 per licensed slot", rosterAvailable ? div(s["acs.u6_working_parents"], capacity) : null, "children / slot", ["acs", "state licensing"]],
    ];
    for (const [family, id, name, value, unit, sources] of ratios) push(family, tag(id), name, r, value, unit, sources, "Cross-source ratio (+1 smoothing on provider counts)");

    push("expected", tag("expected_autistic_3_17"), "Statistically expected autistic children, ages 3–17", r,
      expectedAutistic === undefined ? null : expectedAutistic * CDC_AUTISM_PREVALENCE, "children (estimate)", ["acs", "cdc-addm"], "ACS children × CDC 1 in 31; an expectation, not identified children");
    push("expected", tag("expected_autistic_in_childcare"), "Statistically expected autistic children in licensed child-care capacity", r,
      rosterAvailable ? capacity * CDC_AUTISM_PREVALENCE : null, "children (estimate)", ["state licensing", "cdc-addm"], "Licensed slots × CDC 1 in 31; an expectation, not identified children");
  }

  // Concentration: share of the 10-mile total that sits within 2 miles.
  const conc = (id: string, name: string, at2: number | null | undefined, at10: number | null | undefined, sources: string[]) =>
    push("geography", `concentration.${id}`, `Share of 10-mile ${name} within 2 miles`, null, div(at2 ?? null, at10 ?? null, 100), "%", sources, "2-mile value ÷ 10-mile value");
  const s2 = sums.get(2)!, s10 = sums.get(10)!;
  conc("children", "children", s2["acs.kids"], s10["acs.kids"], ACS);
  conc("children_0_5", "children 0–5", s2["acs.kids_u6"], s10["acs.kids_u6"], ACS);
  conc("disability", "children with a disability", add(s2["acs.dis_u5"], s2["acs.dis_5to17"]), add(s10["acs.dis_u5"], s10["acs.dis_5to17"]), ACS);
  conc("medicaid", "Medicaid-covered children", s2["acs.u19_medicaid"], s10["acs.u19_medicaid"], ACS);
  conc("employer", "employer-insured children", s2["acs.u19_employer"], s10["acs.u19_employer"], ACS);
  conc("licensed_daycares", "licensed child care", rosterAvailable ? within(2).filter((p) => p.kind === "daycare" && p.licensed).length : null, rosterAvailable ? within(10).filter((p) => p.kind === "daycare" && p.licensed).length : null, ["state licensing"]);
  conc("aba", "ABA organizations", supplyKnown ? within(2).filter((p) => p.kind === "aba_provider").length : null, supplyKnown ? within(10).filter((p) => p.kind === "aba_provider").length : null, ["nppes", "osm"]);

  const nearest = (id: string, name: string, filter: (place: MapPlace) => boolean, known: boolean, sources: string[]) => {
    const match = places.filter(filter).sort((a, b) => a.distanceMiles! - b.distanceMiles!)[0];
    push("geography", `nearest.${id}`, `Distance to nearest ${name}`, null, known ? (match ? match.distanceMiles! : 10.01) : null, "miles (10.01 = none within 10)", sources, "Straight-line distance from the selected point");
  };
  nearest("aba", "ABA organization", (p) => p.kind === "aba_provider", supplyKnown, ["nppes", "osm"]);
  nearest("pediatrics", "pediatric practice", (p) => p.kind === "pediatrics", supplyKnown, ["nppes", "osm"]);
  nearest("licensed_daycare", "licensed child care", (p) => p.kind === "daycare" && Boolean(p.licensed), rosterAvailable, ["state licensing"]);
  nearest("priority_daycare", "priority child-care partner", (p) => daycares.some((d) => d.place.id === p.id && d.tier === "priority"), rosterAvailable || osmAvailable, ["state licensing", "websites"]);
  nearest("hospital", "hospital", (p) => p.kind === "hospital", osmAvailable, ["osm"]);
  nearest("school", "school", (p) => p.kind === "school", osmAvailable, ["osm"]);

  const cbpRate = county ? cbpPer10k(county) : null;
  const nppesRate = county ? nppesAbaPer10k(county) : null;
  // County supply context: the business register when a Census API key is configured, else the ABA provider registry.
  const countySupply = cbpRate !== null
    ? { value: cbpRate, median: baseline.medianCbpPer10k, label: "behavioral-health practices (CBP)", sources: ["census-cbp", "census-acs5"] }
    : { value: nppesRate, median: baseline.medianNppesAbaPer10k, label: "ABA organizations (NPPES)", sources: ["cms-nppes-county", "census-acs5"] };
  const childPoverty = county?.metrics["saipe.child_pov_rate"] !== undefined
    ? { value: county.metrics["saipe.child_pov_rate"], sources: ["census-saipe"] }
    : { value: acsCountyRate(county, "acs.kids_pov", "acs.kids_pov_universe"), sources: ["census-acs5"] };
  const uninsuredChildren = county?.metrics["sahie.u19_uninsured_rate"] !== undefined
    ? { value: county.metrics["sahie.u19_uninsured_rate"], sources: ["census-sahie"] }
    : { value: acsCountyRate(county, "acs.u19_uninsured", "acs.u19"), sources: ["census-acs5"] };
  const contextRows: Array<[string, string, number | null, string, string[]]> = [
    ["county_opportunity", "County opportunity score (county data joins)", countyReport?.score ?? null, "/100", ["county-data-joins"]],
    ["county_rank_percentile", "County rank percentile within the state", countyReport?.rank && countyReport.rankedOf ? (1 - (countyReport.rank - 1) / countyReport.rankedOf) * 100 : null, "percentile", ["county-data-joins"]],
    ["county_child_poverty", "County child poverty rate", childPoverty.value ?? null, "%", childPoverty.sources],
    ["county_uninsured_children", "County uninsured children rate", uninsuredChildren.value ?? null, "%", uninsuredChildren.sources],
    ["county_mh_shortage", "County mental-health shortage score (HRSA HPSA)", county?.metrics["hrsa.mh_hpsa_score"] ?? null, "score 0–25", ["hrsa-hpsa"]],
    ["county_behavioral_practices", `County ${countySupply.label} per 10k children`, countySupply.value, "per 10k", countySupply.sources],
  ];
  for (const [id, name, value, unit, sources] of contextRows) push("county_context", `county.${id}`, name, null, value, unit, sources, "County-level statistic for the county containing the point");

  // ---------------------------------------------------------------------------
  // Convergence: each test requires two independent sources to agree.
  // ---------------------------------------------------------------------------
  const s5 = sums.get(5)!;
  const val = (id: string) => indicators.find((item) => item.id === id)?.value ?? null;
  const tests: ConvergenceTest[] = [];
  const test = (id: string, title: string, sources: string[], inputs: Array<number | null | boolean>, pass: () => boolean, detail: string) =>
    tests.push({ id, title, sources, status: inputs.some((input) => input === null) ? "insufficient" : pass() ? "pass" : "fail", detail });

  const youngDensity5 = div(s5["acs.kids_u6"], s5.land);
  const childcare5 = rosterAvailable || osmAvailable ? daycares.filter((d) => d.place.distanceMiles! <= 5).length : null;
  test("C1", "Young children are concentrated here", ["Census ACS tracts", "child-care rosters / OpenStreetMap"], [youngDensity5, baseline.youngDensity, childcare5],
    () => youngDensity5! >= baseline.youngDensity! && childcare5! >= 3,
    `Children 0–5 per sq mi within 5 mi: ${show(youngDensity5)} vs state ${show(baseline.youngDensity)}; ${show(childcare5)} child-care facilities within 5 mi`);

  const disRate5 = div(add(s5["acs.dis_u5"], s5["acs.dis_5to17"]), add(s5["acs.dis_u5_universe"], s5["acs.dis_5to17_universe"]));
  const hpsa = county?.metrics["hrsa.mh_hpsa_score"] ?? null;
  test("C2", "Developmental need with a recognised shortage", ["Census ACS tracts", "HRSA shortage designation / county provider supply"], [disRate5, baseline.disabilityRate, hpsa ?? countySupply.value],
    () => disRate5! >= baseline.disabilityRate! && ((hpsa ?? 0) > 0 || (countySupply.value !== null && countySupply.median !== null && countySupply.value < countySupply.median)),
    `Child disability rate within 5 mi ${show(disRate5, 100)}% vs state ${show(baseline.disabilityRate, 100)}%; HPSA score ${show(hpsa)}; county ${countySupply.label}/10k children ${show(countySupply.value)} vs state median ${show(countySupply.median)}`);

  const aba5 = supplyKnown ? within(5).filter((p) => p.kind === "aba_provider").length : null;
  const abaPer10k5 = aba5 !== null ? div(aba5, s5["acs.kids"], 10_000) : null;
  // Measure A: ABA organizations near the point vs the statewide county median of the same registry measure.
  // Measure B (independent of NPPES): the business register when keyed, else ABA-named facilities on the community map.
  const second = cbpRate !== null
    ? { value: cbpRate, median: baseline.medianCbpPer10k, label: "County Business Patterns behavioral practices" }
    : { value: county ? osmAbaPer10k(county) : null, median: baseline.medianOsmAbaPer10k, label: "OpenStreetMap ABA-named facilities" };
  test("C3", "ABA supply is thin by two independent measures", ["NPPES / OpenStreetMap near the point", second.label + " (county)"], [abaPer10k5, baseline.medianNppesAbaPer10k, second.value, second.median],
    () => abaPer10k5! < baseline.medianNppesAbaPer10k! && second.value! <= second.median!,
    `ABA organizations within 5 mi per 10k children ${show(abaPer10k5)} vs state county median ${show(baseline.medianNppesAbaPer10k)}; county ${second.label} per 10k ${show(second.value)} vs median ${show(second.median)}`);

  const ped5 = nppesAvailable ? zipsWithin(5).reduce((sum, zip) => sum + zip.pediatricClinicians, 0) + within(5).filter((p) => p.kind === "pediatrics").length : null;
  const licensed5 = rosterAvailable ? within(5).filter((p) => p.kind === "daycare" && p.licensed).length : null;
  test("C4", "Referral network is present", ["CMS NPPES pediatric clinicians", "State child-care licensing"], [ped5, licensed5, s5["acs.kids"] ?? null],
    () => ped5! >= (s5["acs.kids"]! / 2000) && licensed5! >= 5,
    `${show(ped5)} pediatric clinicians/practices and ${show(licensed5)} licensed child-care facilities within 5 mi`);

  const insured5 = div(add(s5["acs.u19_employer"], s5["acs.u19_medicaid"]), s5["acs.u19"]);
  const sahie = county?.metrics["sahie.u19_uninsured_rate"] ?? null;
  test("C5", "Children are insured (billable)", ["Census ACS tracts", "SAHIE county model"], [insured5, baseline.insuredShare, sahie, baseline.medianSahieUninsured],
    () => insured5! >= baseline.insuredShare! * 0.98 && sahie! <= baseline.medianSahieUninsured! * 1.1,
    `Employer + Medicaid-only share within 5 mi ${show(insured5, 100)}% vs state ${show(baseline.insuredShare, 100)}%; county SAHIE uninsured ${show(sahie)}% vs state median ${show(baseline.medianSahieUninsured)}%`);

  const density2 = div(s2["acs.kids"], s2.land);
  const nearestAba = val("nearest.aba");
  test("C6", "White space close to families", ["Census ACS + TIGER density", "NPPES / OpenStreetMap provider locations"], [density2, baseline.medianTractChildDensity, nearestAba],
    () => density2! >= baseline.medianTractChildDensity! && nearestAba! > 2,
    `Children per sq mi within 2 mi ${show(density2)} vs state median tract ${show(baseline.medianTractChildDensity)}; nearest ABA organization ${nearestAba === 10.01 ? "none within 10 mi" : (nearestAba ?? "—") + " mi"}`);

  const priority5 = daycares.filter((d) => d.place.distanceMiles! <= 5 && d.tier === "priority").length;
  test("C7", "Child-care partners with inclusion focus", ["State licensing", "Facility name / website language"], [rosterAvailable || osmAvailable ? priority5 : null],
    () => priority5 >= 1, `${priority5} licensed facilities within 5 mi publicly mention inclusion, special needs, therapy or district preschool`);

  const doubleConfirmed = daycares.filter((d) => d.place.distanceMiles! <= 5 && d.confirmedBy >= 2).length;
  test("C8", "Child-care locations confirmed by two sources", ["State licensing", "OpenStreetMap"], [rosterAvailable && osmAvailable ? doubleConfirmed : null],
    () => doubleConfirmed >= 2, `${doubleConfirmed} child-care facilities within 5 mi appear in both the state roster and OpenStreetMap`);

  const evaluated = tests.filter((item) => item.status !== "insufficient").length;
  const passed = tests.filter((item) => item.status === "pass").length;
  const strength = evaluated < 4 ? "insufficient" : passed >= 6 ? "strong" : passed >= 4 ? "moderate" : "weak";

  const rings = SITE_RADII_MILES.map((r) => {
    const s = sums.get(r)!;
    const inR = within(r);
    return {
      radiusMiles: r,
      children: round(s["acs.kids"] ?? null), childrenUnder6: round(s["acs.kids_u6"] ?? null),
      withDisability: round(add(s["acs.dis_u5"], s["acs.dis_5to17"]) ?? null),
      abaProviders: inR.filter((p) => p.kind === "aba_provider").length,
      licensedDaycares: inR.filter((p) => p.kind === "daycare" && p.licensed).length,
      licensedCapacity: inR.filter((p) => p.kind === "daycare" && p.licensed).reduce((sum, p) => sum + (p.capacity ?? 0), 0),
      pediatricSources: inR.filter((p) => p.kind === "pediatrics").length,
    };
  });

  const hotspots = ctx.tracts.map((tract) => ({ tract, distance: haversineMiles(center, tract) }))
    .filter((item) => item.distance <= 10)
    .map(({ tract, distance }) => ({
      geoid: tract.geoid, lat: tract.lat, lon: tract.lon, distanceMiles: Math.round(distance * 10) / 10,
      childrenUnder6: tract.metrics["acs.kids_u6"] ?? 0,
      disabilityRate: round(div(add(tract.metrics["acs.dis_u5"], tract.metrics["acs.dis_5to17"]), add(tract.metrics["acs.dis_u5_universe"], tract.metrics["acs.dis_5to17_universe"]), 100)),
    }));

  if (!ctx.tracts.length) notes.push("Census tract data unavailable: demand indicators are blank, not estimated.");
  if (!supplyKnown) notes.push("Provider sources unavailable: supply and gap indicators are blank, not zero.");
  notes.push("Tract figures are area-weighted estimates of whole-tract statistics; small radii in rural areas carry more uncertainty.");
  notes.push("Expected-autism figures apply CDC's 1-in-31 prevalence to area totals or licensed capacity. They are statistical expectations, not identified children.");

  return { center, countyFips, rings, indicators, daycares, convergence: { tests, passed, evaluated, strength }, hotspots, notes };
}
