export type LeadEngine = "client" | "rbt" | "bcba";
export type IndicatorDirection = "higher_opportunity" | "lower_opportunity" | "context" | "gate" | "confidence";
export type SourceClass = "federal" | "state" | "payer" | "organization" | "labor" | "web" | "derived";

export interface IndicatorPillar {
  id: string;
  title: string;
  engines: LeadEngine[];
  direction: IndicatorDirection;
  sourceClasses: SourceClass[];
  weights: Record<LeadEngine, number>;
  indicators: readonly string[];
}

export interface IndicatorDefinition {
  id: string;
  pillarId: string;
  pillarTitle: string;
  ordinal: number;
  name: string;
  engines: LeadEngine[];
  direction: IndicatorDirection;
  sourceClasses: SourceClass[];
}

export interface IndicatorObservation {
  indicatorId: string;
  value: number;
  confidence: number;
  sourceIds: string[];
  capturedAt?: string;
}

export interface EngineScore {
  engine: LeadEngine;
  score: number;
  confidence: number;
  coverage: number;
  observedIndicators: number;
  applicableIndicators: number;
  pillarBreakdown: Array<{
    pillarId: string;
    title: string;
    score: number;
    observed: number;
    applicable: number;
    weight: number;
  }>;
}

const ALL: LeadEngine[] = ["client", "rbt", "bcba"];

export const INDICATOR_PILLARS: readonly IndicatorPillar[] = [
  {
    id: "demographic-demand",
    title: "Child and demographic demand",
    engines: ["client"],
    direction: "higher_opportunity",
    sourceClasses: ["federal", "state", "derived"],
    weights: { client: 13, rbt: 2, bcba: 2 },
    indicators: [
      "Population age 0-2",
      "Population age 3-5",
      "Population age 6-11",
      "Population age 12-17",
      "Under-18 population share",
      "Under-18 population five-year growth",
      "Annual births",
      "Birth-rate trend",
      "Households with children share",
      "Population forecast momentum for child-serving ages",
    ],
  },
  {
    id: "developmental-demand",
    title: "Developmental and public-program demand",
    engines: ["client"],
    direction: "higher_opportunity",
    sourceClasses: ["state", "federal", "derived"],
    weights: { client: 14, rbt: 3, bcba: 3 },
    indicators: [
      "IDEA Part C child count per 1,000 young children",
      "IDEA Part C child-count trend",
      "Early-intervention referral volume",
      "Early-intervention active-service volume",
      "Early-intervention transition volume",
      "IDEA Part B autism child count per 1,000 students",
      "IDEA Part B autism child-count trend",
      "Developmental-delay child count per 1,000 students",
      "Autism/DD waiver enrollment or aggregate waitlist pressure",
      "Publicly reported developmental-service capacity pressure",
    ],
  },
  {
    id: "referral-ecosystem",
    title: "Referral ecosystem",
    engines: ["client"],
    direction: "higher_opportunity",
    sourceClasses: ["federal", "state", "organization", "derived"],
    weights: { client: 15, rbt: 1, bcba: 1 },
    indicators: [
      "General pediatrician density",
      "Developmental pediatrician density",
      "Child psychologist density",
      "Autism/developmental evaluation provider density",
      "Speech-language pathologist density",
      "Occupational therapist density",
      "Licensed child-care organization density",
      "Head Start and preschool site density",
      "Early-intervention agency/program density",
      "Child Find and early-childhood special-education coverage",
    ],
  },
  {
    id: "aba-supply",
    title: "ABA supply and capacity",
    engines: ALL,
    direction: "lower_opportunity",
    sourceClasses: ["federal", "state", "payer", "organization", "web", "derived"],
    weights: { client: 14, rbt: 8, bcba: 8 },
    indicators: [
      "ABA organization density",
      "Unique ABA service-location density",
      "Licensed behavior-analyst density",
      "Medicaid-enrolled ABA provider density",
      "Commercial in-network ABA provider density",
      "Zero-provider or low-provider geography flag",
      "Publicly reported ABA waitlist pressure",
      "Average travel distance to identified ABA service locations",
      "Published operating-hour availability",
      "Documented provider capacity constraints or intake closures",
    ],
  },
  {
    id: "payer-economics",
    title: "Payer and reimbursement economics",
    engines: ALL,
    direction: "higher_opportunity",
    sourceClasses: ["payer", "state", "organization", "derived"],
    weights: { client: 12, rbt: 9, bcba: 9 },
    indicators: [
      "Commercial autism-mandate applicability",
      "ABA covered-age breadth",
      "ABA hour or dollar-limit generosity",
      "Prior-authorization burden",
      "Treatment-plan review burden",
      "Medicaid ABA benefit availability",
      "Published Medicaid ABA fee level",
      "Managed-care network contracting opportunity",
      "Commercial network-gap opportunity",
      "Payer-mix economic attractiveness proxy",
    ],
  },
  {
    id: "access-geography",
    title: "Geographic access and operating fit",
    engines: ALL,
    direction: "higher_opportunity",
    sourceClasses: ["federal", "state", "derived"],
    weights: { client: 8, rbt: 7, bcba: 7 },
    indicators: [
      "Population reachable within 15 minutes",
      "Population reachable within 30 minutes",
      "Population reachable within 45 minutes",
      "Child population reachable within 30 minutes",
      "Referral-source geographic concentration",
      "Rural service-dispersion burden",
      "Home-service travel burden",
      "Hospital/medical-center proximity",
      "Distance from existing Clear Steps operating footprint",
      "Cross-state operating complexity",
    ],
  },
  {
    id: "rbt-workforce",
    title: "RBT workforce",
    engines: ["rbt", "client"],
    direction: "higher_opportunity",
    sourceClasses: ["labor", "organization", "web", "derived"],
    weights: { client: 5, rbt: 24, bcba: 2 },
    indicators: [
      "Public RBT openings per 100,000 residents",
      "RBT posting trend over 30 days",
      "RBT posting trend over 90 days",
      "Median advertised RBT hourly pay",
      "RBT sign-on bonus prevalence",
      "Full-time RBT opening share",
      "Entry-level RBT opening share",
      "Competing ABA employers actively hiring RBTs",
      "Employer-provided RBT training prevalence",
      "Local technician training-pipeline strength",
    ],
  },
  {
    id: "bcba-workforce",
    title: "BCBA/LBA workforce",
    engines: ["bcba", "client"],
    direction: "higher_opportunity",
    sourceClasses: ["labor", "state", "organization", "web", "derived"],
    weights: { client: 4, rbt: 2, bcba: 24 },
    indicators: [
      "Public BCBA/LBA openings per 100,000 residents",
      "BCBA/LBA posting trend over 30 days",
      "BCBA/LBA posting trend over 90 days",
      "Median advertised analyst salary",
      "BCBA/LBA sign-on or relocation prevalence",
      "Hybrid or remote-supervision prevalence",
      "Active state-licensed analyst density",
      "Licensed-analyst-to-open-job ratio",
      "Local behavior-analysis graduate-program pipeline",
      "Estimated analyst supervision-capacity pressure",
    ],
  },
  {
    id: "market-motion",
    title: "Competitive and market movement",
    engines: ALL,
    direction: "higher_opportunity",
    sourceClasses: ["organization", "labor", "web", "derived"],
    weights: { client: 7, rbt: 8, bcba: 8 },
    indicators: [
      "ABA competitor opening activity",
      "ABA competitor expansion activity",
      "ABA competitor closure activity",
      "Competitor hiring acceleration",
      "Competitor hiring contraction",
      "New clinic construction or lease signals",
      "Public acquisition or consolidation activity",
      "Publicly announced waitlist/intake expansion",
      "Service-line expansion into ABA/autism care",
      "Market momentum persistence across repeated snapshots",
    ],
  },
  {
    id: "regulatory",
    title: "Regulatory and credentialing constraints",
    engines: ALL,
    direction: "gate",
    sourceClasses: ["state", "payer", "federal"],
    weights: { client: 0, rbt: 0, bcba: 0 },
    indicators: [
      "State LBA practice requirement",
      "State LaBA supervision requirement",
      "State technician/line-therapist supervision rule",
      "State provisional or temporary license pathway",
      "Named professional state-license verification",
      "Named professional national-certification verification",
      "Medicaid provider-enrollment requirement",
      "Medicaid technician credential requirement",
      "Commercial payer credentialing requirement",
      "Scope-of-practice or plan-specific compliance review flag",
    ],
  },
  {
    id: "relationship-quality",
    title: "Organization and referral relationship quality",
    engines: ["client"],
    direction: "higher_opportunity",
    sourceClasses: ["organization", "web", "state", "derived"],
    weights: { client: 12, rbt: 1, bcba: 1 },
    indicators: [
      "Public organization contactability",
      "Direct referral/intake form availability",
      "Decision-maker or program-contact visibility",
      "Organization service fit with ABA referral needs",
      "Organization child-serving focus",
      "Autism/developmental service adjacency",
      "Payer alignment with Clear Steps target plans",
      "Multi-location referral leverage",
      "Existing partnership/outreach activity signal",
      "Independent evidence supporting referral relevance",
    ],
  },
  {
    id: "evidence-quality",
    title: "Evidence quality and persistence",
    engines: ALL,
    direction: "confidence",
    sourceClasses: ["federal", "state", "payer", "organization", "labor", "web", "derived"],
    weights: { client: 0, rbt: 0, bcba: 0 },
    indicators: [
      "Independent source count",
      "Independent source-type diversity",
      "First-party source ratio",
      "Government or payer source ratio",
      "Evidence freshness",
      "Entity-resolution confidence",
      "Geographic-resolution confidence",
      "Source agreement score",
      "Indicator coverage and missingness quality",
      "Evidence persistence across repeated snapshots",
    ],
  },
] as const;

export const INDICATOR_CATALOG: readonly IndicatorDefinition[] = INDICATOR_PILLARS.flatMap((pillar) =>
  pillar.indicators.map((name, index) => ({
    id: `${pillar.id}.${String(index + 1).padStart(2, "0")}`,
    pillarId: pillar.id,
    pillarTitle: pillar.title,
    ordinal: index + 1,
    name,
    engines: pillar.engines,
    direction: pillar.direction,
    sourceClasses: pillar.sourceClasses,
  })),
);

const definitionById = new Map(INDICATOR_CATALOG.map((definition) => [definition.id, definition]));

export function scoreEngineFromObservations(engine: LeadEngine, observations: readonly IndicatorObservation[]): EngineScore {
  const safeObservations = observations
    .filter((observation) => definitionById.has(observation.indicatorId))
    .map((observation) => ({
      ...observation,
      value: clamp(observation.value),
      confidence: clamp(observation.confidence),
    }));

  const applicable = INDICATOR_CATALOG.filter((definition) =>
    definition.engines.includes(engine) && definition.direction !== "gate" && definition.direction !== "confidence",
  );
  const observedApplicable = safeObservations.filter((observation) => {
    const definition = definitionById.get(observation.indicatorId);
    return Boolean(definition && definition.engines.includes(engine) && definition.direction !== "gate" && definition.direction !== "confidence");
  });

  const pillarBreakdown = INDICATOR_PILLARS
    .filter((pillar) => pillar.weights[engine] > 0)
    .map((pillar) => {
      const pillarDefinitions = applicable.filter((definition) => definition.pillarId === pillar.id);
      const pillarObservations = observedApplicable.filter((observation) =>
        definitionById.get(observation.indicatorId)?.pillarId === pillar.id,
      );
      const values = pillarObservations.map((observation) => {
        const direction = definitionById.get(observation.indicatorId)?.direction;
        return direction === "lower_opportunity" ? 100 - observation.value : observation.value;
      });
      return {
        pillarId: pillar.id,
        title: pillar.title,
        score: values.length ? average(values) : 0,
        observed: pillarObservations.length,
        applicable: pillarDefinitions.length,
        weight: pillar.weights[engine],
      };
    });

  const observedWeight = pillarBreakdown.reduce((sum, pillar) => sum + (pillar.observed > 0 ? pillar.weight : 0), 0);
  const weightedScore = observedWeight
    ? pillarBreakdown.reduce((sum, pillar) => sum + (pillar.observed > 0 ? pillar.score * pillar.weight : 0), 0) / observedWeight
    : 0;
  const coverage = applicable.length ? Math.round((observedApplicable.length / applicable.length) * 100) : 0;

  const confidenceObservations = safeObservations.filter((observation) =>
    definitionById.get(observation.indicatorId)?.direction === "confidence",
  );
  const sourceConfidence = observedApplicable.length ? average(observedApplicable.map((observation) => observation.confidence)) : 0;
  const evidenceConfidence = confidenceObservations.length ? average(confidenceObservations.map((observation) => observation.value)) : sourceConfidence;
  const confidence = Math.round((sourceConfidence * 0.55) + (evidenceConfidence * 0.25) + (coverage * 0.2));

  return {
    engine,
    score: Math.round(weightedScore),
    confidence: clamp(confidence),
    coverage: clamp(coverage),
    observedIndicators: observedApplicable.length,
    applicableIndicators: applicable.length,
    pillarBreakdown,
  };
}

export function indicatorsForEngine(engine: LeadEngine) {
  return INDICATOR_CATALOG.filter((definition) => definition.engines.includes(engine));
}

export function indicatorDefinition(id: string) {
  return definitionById.get(id);
}

function average(values: readonly number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
