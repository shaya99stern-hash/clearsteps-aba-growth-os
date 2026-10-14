import type { ResolvedLead } from "../source-types";
import { V6_PUBLIC_SOURCE_CHANNELS } from "./v6-source-channels";

/**
 * 200 hardcoded client-acquisition narrowing signals.
 *
 * Every client Scout run uses them automatically, twice:
 *   1. Discovery — the highest-value signals (state referral gateways, Medicaid plans, diagnostic
 *      pathways, unmet-demand language) become extra public searches, so Scout actively hunts for
 *      the organizations that route children to ABA instead of waiting for generic results.
 *   2. Ranking — every lead's public evidence is matched against all 200 signals; leads that sit on
 *      a real referral pathway, take the state's Medicaid plans or show unmet demand rise to the top
 *      and carry the matched signals as reasons.
 *
 * Signals describe organizations and public programs only. None identifies, infers or targets an
 * individual child, parent or household.
 */
export type NarrowingState = "MO" | "KS" | "CO";

export type NarrowingDimension =
  | "referral-gateway" | "disability-authority" | "medicaid-fit" | "coverage-fit" | "diagnostic-pathway"
  | "unmet-demand" | "age-fit" | "service-setting" | "school-pathway" | "therapy-partner"
  | "family-hub" | "health-system" | "early-childhood" | "language-access" | "access-gap"
  | "military-and-care" | "community-anchor" | "competitor-strain" | "funding-tailwind" | "demand-data";

/** What a dimension means for winning new clients. */
export const NARROWING_DIMENSIONS: Record<NarrowingDimension, { title: string; role: "referral pathway" | "payer fit" | "unmet demand" | "service fit" | "context" }> = {
  "referral-gateway": { title: "Early intervention and Child Find gateway", role: "referral pathway" },
  "disability-authority": { title: "Local developmental disability authority", role: "referral pathway" },
  "medicaid-fit": { title: "State Medicaid plan fit", role: "payer fit" },
  "coverage-fit": { title: "Commercial, military and waiver coverage", role: "payer fit" },
  "diagnostic-pathway": { title: "Autism diagnostic pathway", role: "referral pathway" },
  "unmet-demand": { title: "Unmet ABA demand", role: "unmet demand" },
  "age-fit": { title: "Ages 2–18 program fit", role: "service fit" },
  "service-setting": { title: "Service setting fit", role: "service fit" },
  "school-pathway": { title: "School and special education pathway", role: "referral pathway" },
  "therapy-partner": { title: "Co-treating therapy partner", role: "referral pathway" },
  "family-hub": { title: "Family support hub", role: "referral pathway" },
  "health-system": { title: "Pediatric health-system pathway", role: "referral pathway" },
  "early-childhood": { title: "Early-childhood program", role: "referral pathway" },
  "language-access": { title: "Language and cultural access", role: "service fit" },
  "access-gap": { title: "Geographic access gap", role: "unmet demand" },
  "military-and-care": { title: "Military, foster and adoptive families", role: "referral pathway" },
  "community-anchor": { title: "Inclusive community anchor", role: "context" },
  "competitor-strain": { title: "Competitor capacity strain", role: "unmet demand" },
  "funding-tailwind": { title: "Funding and policy tailwind", role: "context" },
  "demand-data": { title: "Published child demand data", role: "unmet demand" },
};

export interface NarrowingSignal {
  id: string;
  dimension: NarrowingDimension;
  name: string;
  /** Every term must appear in the public text (case-insensitive, whole words). */
  terms: readonly string[];
  /** Client-acquisition value, 1 (context) … 5 (direct referral source, payer match or demand). */
  weight: 1 | 2 | 3 | 4 | 5;
  /** Restricts a state-specific program name to the states where it exists. */
  states?: readonly NarrowingState[];
  /** When present, Scout actively searches for this signal. */
  probe?: string;
}

type Spec = readonly [name: string, terms: readonly string[], weight: NarrowingSignal["weight"], options?: { states?: readonly NarrowingState[]; probe?: string }];

const SPECS: Record<NarrowingDimension, readonly Spec[]> = {
  "referral-gateway": [
    ["Missouri First Steps early intervention", ["first steps", "early intervention"], 5, { states: ["MO"], probe: "First Steps early intervention provider referral" }],
    ["Kansas tiny-k early intervention", ["tiny-k"], 5, { states: ["KS"], probe: "tiny-k early intervention program" }],
    ["Early Intervention Colorado", ["early intervention colorado"], 5, { states: ["CO"], probe: "Early Intervention Colorado local program" }],
    ["Child Find developmental screening", ["child find"], 4, { probe: "Child Find developmental screening ages 3-21" }],
    ["Parents as Teachers", ["parents as teachers"], 4, { probe: "Parents as Teachers developmental screening" }],
    ["Part C early intervention", ["part c", "early intervention"], 4],
    ["Developmental screening program", ["developmental screening"], 3],
    ["Early childhood special education", ["early childhood special education"], 4, { probe: "early childhood special education program autism" }],
    ["Infant-toddler services", ["infant toddler services"], 3],
    ["Transition at age three", ["transition", "age three"], 3],
  ],
  "disability-authority": [
    ["SB 40 county disability board", ["sb 40"], 5, { states: ["MO"], probe: "SB 40 board developmental disabilities services children" }],
    ["Senate Bill 40 board", ["senate bill 40"], 5, { states: ["MO"] }],
    ["Children's Services Fund", ["children's services fund"], 5, { states: ["MO"], probe: "Children's Services Fund behavioral health grant" }],
    ["DMH developmental disabilities regional office", ["regional office", "developmental disabilities"], 4, { states: ["MO"] }],
    ["CDDO", ["cddo"], 5, { states: ["KS"], probe: "CDDO community developmental disability organization" }],
    ["Community Developmental Disability Organization", ["community developmental disability organization"], 5, { states: ["KS"] }],
    ["Community Centered Board", ["community centered board"], 5, { states: ["CO"], probe: "Community Centered Board developmental disabilities children" }],
    ["Case management agency", ["case management agency"], 4, { states: ["CO"] }],
    ["Developmental disabilities council", ["developmental disabilities council"], 2],
    ["County developmental disabilities board", ["developmental disabilities board"], 4],
  ],
  "medicaid-fit": [
    ["MO HealthNet", ["mo healthnet"], 5, { states: ["MO"], probe: "MO HealthNet ABA autism provider" }],
    ["KanCare", ["kancare"], 5, { states: ["KS"], probe: "KanCare ABA autism provider" }],
    ["Health First Colorado", ["health first colorado"], 5, { states: ["CO"], probe: "Health First Colorado ABA autism provider" }],
    ["Home State Health", ["home state health"], 4, { states: ["MO"] }],
    ["Healthy Blue", ["healthy blue"], 4, { states: ["MO"] }],
    ["Sunflower Health Plan", ["sunflower health"], 4, { states: ["KS"] }],
    ["Aetna Better Health", ["aetna better health"], 4],
    ["UnitedHealthcare Community Plan", ["unitedhealthcare community plan"], 4],
    ["Regional Accountable Entity", ["regional accountable entity"], 4, { states: ["CO"] }],
    ["Accepts Medicaid", ["accepts medicaid"], 4],
  ],
  "coverage-fit": [
    ["TRICARE Autism Care Demonstration", ["tricare"], 4, { probe: "TRICARE autism care demonstration ABA" }],
    ["Autism insurance coverage", ["autism insurance"], 3],
    ["Blue Cross Blue Shield", ["blue cross"], 3],
    ["Cigna", ["cigna"], 2],
    ["Aetna", ["aetna"], 2],
    ["UnitedHealthcare", ["unitedhealthcare"], 2],
    ["Optum", ["optum"], 2],
    ["Autism waiver", ["autism waiver"], 5, { probe: "autism waiver ABA services children" }],
    ["Children's Extensive Support waiver", ["children's extensive support"], 4, { states: ["CO"] }],
    ["Partnership for Hope waiver", ["partnership for hope"], 3, { states: ["MO"] }],
  ],
  "diagnostic-pathway": [
    ["Autism evaluation", ["autism evaluation"], 5, { probe: "autism diagnostic evaluation children clinic" }],
    ["Autism diagnostic evaluation", ["diagnostic evaluation", "autism"], 5],
    ["ADOS assessment", ["ados"], 4],
    ["Developmental pediatrics", ["developmental pediatrics"], 5, { probe: "developmental behavioral pediatrics clinic" }],
    ["Developmental-behavioral pediatrician", ["developmental-behavioral"], 5],
    ["Psychological evaluation", ["psychological evaluation"], 3],
    ["M-CHAT screening", ["m-chat"], 4],
    ["Evaluation waitlist", ["evaluation", "waitlist"], 5, { probe: "autism evaluation waitlist" }],
    ["Autism clinic", ["autism clinic"], 4],
    ["Neuropsychological testing", ["neuropsychological"], 3],
  ],
  "unmet-demand": [
    ["ABA waitlist", ["aba", "waitlist"], 5, { probe: "ABA therapy waitlist" }],
    ["Wait list", ["wait list"], 4],
    ["Not accepting new clients", ["not accepting new"], 4],
    ["Accepting new clients", ["accepting new clients"], 3],
    ["Now enrolling", ["now enrolling"], 3],
    ["Immediate openings", ["immediate openings"], 3],
    ["Limited availability", ["limited availability"], 2],
    ["Long wait", ["long wait"], 4],
    ["Waiting months", ["waiting months"], 4],
    ["Provider shortage", ["shortage", "providers"], 4],
  ],
  "age-fit": [
    ["Ages 2 and up", ["ages 2"], 3],
    ["Preschool autism services", ["preschool", "autism"], 4],
    ["School-age services", ["school-age"], 3],
    ["Kindergarten readiness", ["kindergarten readiness"], 3],
    ["Toddler program", ["toddler"], 2],
    ["Adolescent services", ["adolescent"], 2],
    ["Teen social skills", ["teen", "social skills"], 3],
    ["Elementary students", ["elementary"], 1],
    ["Middle school students", ["middle school"], 1],
    ["Transition-age youth", ["transition-age"], 2],
  ],
  "service-setting": [
    ["In-home services", ["in-home"], 4],
    ["Center-based services", ["center-based"], 3],
    ["Clinic-based services", ["clinic-based"], 3],
    ["School-based services", ["school-based"], 3],
    ["Telehealth", ["telehealth"], 2],
    ["Parent training", ["parent training"], 4],
    ["Early intensive behavioral intervention", ["early intensive"], 4],
    ["Social skills group", ["social skills group"], 3],
    ["Day treatment", ["day treatment"], 3],
    ["Community-based services", ["community-based"], 2],
  ],
  "school-pathway": [
    ["IEP services", ["iep"], 3],
    ["504 plan", ["504 plan"], 2],
    ["Special education cooperative", ["special education cooperative"], 4, { probe: "special education cooperative autism services" }],
    ["Special education interlocal", ["interlocal"], 4, { states: ["KS"] }],
    ["BOCES", ["boces"], 4, { states: ["CO"] }],
    ["Paraprofessional staffing", ["paraprofessional"], 2],
    ["Behavior specialist", ["behavior specialist"], 3],
    ["Extended school year", ["extended school year"], 3],
    ["Autism classroom", ["autism classroom"], 4],
    ["School psychologist", ["school psychologist"], 2],
  ],
  "therapy-partner": [
    ["Pediatric speech therapy", ["speech therapy"], 4, { probe: "pediatric speech therapy clinic children" }],
    ["Pediatric occupational therapy", ["occupational therapy"], 4, { probe: "pediatric occupational therapy clinic children" }],
    ["Feeding therapy", ["feeding therapy"], 4],
    ["Pediatric physical therapy", ["pediatric physical therapy"], 3],
    ["Child psychologist", ["child psychologist"], 4],
    ["Child psychiatry", ["child psychiatry"], 3],
    ["Pediatric sleep", ["pediatric sleep"], 2],
    ["Toilet training", ["toilet training"], 2],
    ["Child counseling", ["child counseling"], 3],
    ["Sensory integration", ["sensory integration"], 3],
  ],
  "family-hub": [
    ["Parent support group", ["parent support group"], 4],
    ["Autism support group", ["autism support group"], 5, { probe: "autism parent support group" }],
    ["Respite care", ["respite"], 3],
    ["Family navigator", ["family navigator"], 4],
    ["Family-to-family", ["family-to-family"], 4],
    ["Parent mentor", ["parent mentor"], 3],
    ["Parent training and information center", ["parent training and information"], 4],
    ["Family resource center", ["family resource center"], 4],
    ["Sibling program", ["sibshop"], 2],
    ["Lending library", ["lending library"], 1],
  ],
  "health-system": [
    ["Pediatric primary care", ["pediatric primary care"], 4],
    ["Pediatrician referral", ["pediatrician", "referral"], 5],
    ["Children's hospital", ["children's hospital"], 3],
    ["Federally qualified health center", ["federally qualified health center"], 4],
    ["Community health center", ["community health center"], 3],
    ["Integrated behavioral health", ["integrated behavioral health"], 3],
    ["Well-child screening", ["well-child"], 3],
    ["NICU follow-up", ["nicu follow-up"], 4],
    ["Care coordination", ["care coordination"], 3],
    ["Prior authorization", ["prior authorization"], 2],
  ],
  "early-childhood": [
    ["Head Start", ["head start"], 4, { probe: "Head Start disability services coordinator" }],
    ["Early Head Start", ["early head start"], 4],
    ["Inclusive child care", ["inclusive child care"], 4],
    ["Inclusive preschool", ["inclusive preschool"], 4],
    ["Child care resource and referral", ["resource and referral"], 3],
    ["Developmental preschool", ["developmental preschool"], 5],
    ["Pre-K special education", ["pre-k", "special education"], 4],
    ["Early childhood mental health consultation", ["early childhood mental health consultation"], 4],
    ["Colorado Shines rated program", ["colorado shines"], 2, { states: ["CO"] }],
    ["Home visiting", ["home visiting"], 3],
  ],
  "language-access": [
    ["Spanish-language services", ["spanish"], 3],
    ["Bilingual staff", ["bilingual"], 3],
    ["Se habla español", ["se habla"], 3],
    ["Interpreter services", ["interpreter"], 2],
    ["Vietnamese-language services", ["vietnamese"], 2],
    ["Somali-language services", ["somali"], 2],
    ["Arabic-language services", ["arabic"], 2],
    ["American Sign Language", ["american sign language"], 1],
    ["Refugee family services", ["refugee"], 2],
    ["Culturally responsive care", ["culturally responsive"], 2],
  ],
  "access-gap": [
    ["Rural service area", ["rural"], 3],
    ["No ABA providers nearby", ["no aba providers"], 5],
    ["Hours of driving for therapy", ["drive", "hours", "therapy"], 3],
    ["Transportation barrier", ["transportation"], 2],
    ["Underserved community", ["underserved"], 3],
    ["Health professional shortage area", ["shortage area"], 4],
    ["Mental health shortage", ["mental health shortage"], 3],
    ["Broadband gap", ["broadband"], 1],
    ["Nearest provider far away", ["nearest provider"], 4],
    ["Medicaid provider shortage", ["medicaid", "shortage"], 4],
  ],
  "military-and-care": [
    ["Military families", ["military families"], 4],
    ["Exceptional Family Member Program", ["efmp"], 4],
    ["Fort Riley", ["fort riley"], 4, { states: ["KS"] }],
    ["Fort Leavenworth", ["fort leavenworth"], 4, { states: ["KS"] }],
    ["Fort Carson", ["fort carson"], 4, { states: ["CO"] }],
    ["Whiteman Air Force Base", ["whiteman"], 3, { states: ["MO"] }],
    ["Fort Leonard Wood", ["fort leonard wood"], 4, { states: ["MO"] }],
    ["Foster care services", ["foster care"], 3],
    ["Kinship care", ["kinship"], 2],
    ["Adoption support", ["adoption"], 2],
  ],
  "community-anchor": [
    ["Sensory-friendly programming", ["sensory-friendly"], 3],
    ["Autism-friendly programming", ["autism-friendly"], 3],
    ["Special needs ministry", ["special needs ministry"], 3],
    ["Adaptive recreation", ["adaptive recreation"], 3],
    ["Inclusive playground", ["inclusive playground"], 2],
    ["Miracle League", ["miracle league"], 2],
    ["Special Olympics", ["special olympics"], 2],
    ["YMCA inclusion", ["ymca", "inclusion"], 2],
    ["Sensory storytime", ["sensory storytime"], 3],
    ["Autism awareness event", ["autism awareness"], 2],
  ],
  "competitor-strain": [
    ["ABA clinic closing", ["aba", "closing"], 4],
    ["Provider closed", ["closed its doors"], 3],
    ["Staffing shortage", ["staffing shortage"], 4],
    ["BCBA shortage", ["bcba shortage"], 4],
    ["RBT shortage", ["rbt shortage"], 4],
    ["Intake paused", ["intake paused"], 4],
    ["Not accepting Medicaid", ["not accepting medicaid"], 5],
    ["Reduced hours", ["reduced hours"], 2],
    ["ABA provider acquired", ["aba", "acquired"], 2],
    ["New ABA clinic", ["new clinic", "aba"], 2],
  ],
  "funding-tailwind": [
    ["ABA rate increase", ["rate increase", "aba"], 4],
    ["Reimbursement rate change", ["reimbursement rate"], 3],
    ["Autism insurance mandate", ["autism mandate"], 3],
    ["Behavior analyst licensure", ["behavior analyst", "license"], 2],
    ["Autism grant awarded", ["grant", "autism"], 3],
    ["Autism appropriation", ["appropriation", "autism"], 3],
    ["Medicaid expansion", ["medicaid expansion"], 2],
    ["EPSDT benefit", ["epsdt"], 4],
    ["Medical necessity criteria", ["medical necessity"], 2],
    ["Waiver waiting list", ["waiver", "waiting list"], 4],
  ],
  "demand-data": [
    ["Autism prevalence", ["autism prevalence"], 3],
    ["Special education child count", ["child count"], 3],
    ["Students with autism", ["students with autism"], 4],
    ["Eligible for special education", ["eligible for special education"], 3],
    ["Developmental delay", ["developmental delay"], 4],
    ["Enrollment growth", ["enrollment growth"], 2],
    ["Population growth", ["population growth"], 2],
    ["Birth trends", ["births"], 1],
    ["Child care slots", ["child care slots"], 2],
    ["Kindergarten enrollment", ["kindergarten enrollment"], 2],
  ],
};

export const CLIENT_NARROWING_SIGNALS: readonly NarrowingSignal[] = (Object.keys(SPECS) as NarrowingDimension[]).flatMap((dimension) =>
  SPECS[dimension].map(([name, terms, weight, options], index) => ({
    id: `N${String(Object.keys(SPECS).indexOf(dimension) * 10 + index + 1).padStart(3, "0")}`,
    dimension,
    name,
    terms,
    weight,
    ...(options?.states ? { states: options.states } : {}),
    ...(options?.probe ? { probe: options.probe } : {}),
  })),
);

const matchers = new Map(CLIENT_NARROWING_SIGNALS.map((signal) => [
  signal.id,
  signal.terms.map((term) => new RegExp(`(?<![a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i")),
]));

function applies(signal: NarrowingSignal, state: NarrowingState) {
  return !signal.states || signal.states.includes(state);
}

/** Signals whose every term appears (as whole words) in the text, for the given state. */
export function matchNarrowingSignals(text: string, state: NarrowingState): NarrowingSignal[] {
  const normalized = text.replace(/[’‘]/g, "'");
  return CLIENT_NARROWING_SIGNALS.filter((signal) =>
    applies(signal, state) && matchers.get(signal.id)!.every((pattern) => pattern.test(normalized)),
  );
}

export interface LeadNarrowing {
  /** 0–100 client-acquisition fit from matched signals. */
  score: number;
  /** Ranking bonus added to the youth-qualification priority (0–25). */
  priorityBonus: number;
  matched: Array<{ id: string; name: string; dimension: NarrowingDimension; weight: number }>;
  roles: string[];
}

/**
 * Score a lead against all 200 signals using only its own public evidence. Within a dimension the
 * strongest signal counts fully and the rest at a third (capped at 2 points), so ten synonyms of one
 * fact cannot outrank a lead with several independent kinds of client-acquisition evidence.
 */
export function narrowLead(lead: Pick<ResolvedLead, "name" | "evidence" | "reasons">, state: NarrowingState): LeadNarrowing {
  const text = [lead.name, ...lead.evidence.map((item) => `${item.title} ${item.snippet}`)].join(" \n ");
  const matched = matchNarrowingSignals(text, state);
  const byDimension = new Map<NarrowingDimension, number[]>();
  for (const signal of matched) byDimension.set(signal.dimension, [...(byDimension.get(signal.dimension) ?? []), signal.weight]);
  let raw = 0;
  for (const weights of byDimension.values()) {
    const [best, ...rest] = [...weights].sort((a, b) => b - a);
    // Supporting signals add at most 2 points, so one dimension alone cannot make a strong fit.
    raw += best + Math.min(2, rest.reduce((sum, value) => sum + value / 3, 0));
  }
  const score = Math.min(100, Math.round(raw * 5));
  return {
    score,
    priorityBonus: Math.round(score / 4),
    matched: [...matched]
      .sort((a, b) => b.weight - a.weight)
      .map((signal) => ({ id: signal.id, name: signal.name, dimension: signal.dimension, weight: signal.weight })),
    roles: [...new Set(matched.filter((signal) => signal.weight >= 3).map((signal) => NARROWING_DIMENSIONS[signal.dimension].role))]
      .filter((role) => role !== "context"),
  };
}

/** Apply narrowing to a lead: reasons and signal tags that the lead feed already displays. */
export function withNarrowing<T extends ResolvedLead>(lead: T, narrowing: LeadNarrowing): T {
  if (!narrowing.matched.length) return lead;
  const top = narrowing.matched.slice(0, 3).map((signal) => signal.name);
  const reason = `Client fit ${narrowing.score}/100: ${top.join(", ")}`;
  return {
    ...lead,
    reasons: [reason, ...lead.reasons.filter((item) => !item.startsWith("Client fit "))],
    signals: [...new Set([...narrowing.roles, ...lead.signals])],
  };
}

const STATE_NAMES: Record<NarrowingState, string> = { MO: "Missouri", KS: "Kansas", CO: "Colorado" };

/**
 * Hunting queries for one client run: state-specific gateway probes first, then the strongest
 * general probes, then site searches on this release's state and federal publishers. A daily
 * rotation spreads later runs across the full probe and source set.
 */
export function clientNarrowingQueries(state: NarrowingState, location: string, rotation = 0, max = 6): string[] {
  const place = (location.trim() || STATE_NAMES[state]).slice(0, 90);
  const probes = CLIENT_NARROWING_SIGNALS.filter((signal) => signal.probe && applies(signal, state));
  const stateSpecific = probes.filter((signal) => signal.states?.includes(state));
  const general = probes.filter((signal) => !signal.states).sort((a, b) => b.weight - a.weight);
  const rotate = <T,>(items: readonly T[], count: number, offset: number) =>
    items.length ? Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(rotation + offset + i) % items.length]) : [];
  const channels = V6_PUBLIC_SOURCE_CHANNELS.filter((channel) =>
    (channel.scope === state || channel.scope === "federal") &&
    ["referral", "program", "payer", "provider", "education"].includes(channel.kind) &&
    channel.access !== "aggregate-only");
  // Reserve two slots for v6 publisher site searches; split the rest between state gateways and
  // the strongest general probes.
  const siteSlots = Math.min(2, Math.max(0, max - 1));
  const probeBudget = max - siteSlots;
  const stateProbes = rotate(stateSpecific, Math.ceil(probeBudget / 2), 0);
  const generalProbes = rotate(general, probeBudget - stateProbes.length, 3);
  const queries = [
    ...[...stateProbes, ...generalProbes].map((signal) => `${signal.probe} ${place}`),
    ...rotate(channels, siteSlots, 11).map((channel) => `site:${channel.host} ${channel.focus ?? "children developmental services"} ${place}`),
  ];
  return [...new Set(queries)].slice(0, max);
}

export interface NarrowingSummary {
  signals: number;
  dimensions: number;
  probes: string[];
  leadsMatched: number;
  strongLeads: number;
  topSignals: Array<{ name: string; leads: number }>;
}

export function summarizeNarrowing(probes: string[], narrowed: readonly LeadNarrowing[]): NarrowingSummary {
  const counts = new Map<string, number>();
  for (const lead of narrowed) for (const signal of lead.matched) counts.set(signal.name, (counts.get(signal.name) ?? 0) + 1);
  return {
    signals: CLIENT_NARROWING_SIGNALS.length,
    dimensions: Object.keys(NARROWING_DIMENSIONS).length,
    probes,
    leadsMatched: narrowed.filter((lead) => lead.matched.length > 0).length,
    strongLeads: narrowed.filter((lead) => lead.score >= 40).length,
    topSignals: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, leads]) => ({ name, leads })),
  };
}
