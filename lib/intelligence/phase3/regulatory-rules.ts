export type AbaState = "MO" | "KS";
export type AbaRole = "client" | "rbt" | "bcba" | "laba" | "organization";
export type PayerContext = "commercial" | "medicaid" | "mo-healthnet" | "kancare" | "self-funded" | "unknown";
export type GateStatus = "PASS" | "REVIEW" | "BLOCK" | "INFO";

export interface RegulatoryRule {
  id: string;
  state: AbaState;
  domain: "licensure" | "supervision" | "credentialing" | "medicaid" | "commercial-insurance";
  title: string;
  summary: string;
  roles: AbaRole[];
  payers: PayerContext[];
  effectiveDate: string;
  lastVerifiedAt: string;
  sourceUrl: string;
  sourceLabel: string;
  posture: GateStatus;
}

export interface RegulatoryContext {
  state: AbaState;
  role: AbaRole;
  payer?: PayerContext;
  stateLicenseVerified?: boolean;
  nationalCredentialVerified?: boolean;
  directLbaSupervisionVerified?: boolean;
  rbtCompetencyAssessmentDate?: string;
  asOf?: string;
}

export interface RegulatoryDecision {
  status: GateStatus;
  ruleId: string;
  title: string;
  detail: string;
  sourceUrl: string;
}

export const REGULATORY_RULES: readonly RegulatoryRule[] = [
  {
    id: "mo-lba-practice-337-315",
    state: "MO",
    domain: "licensure",
    title: "Missouri ABA practice requires an authorized licensure pathway",
    summary: "RSMo 337.315 limits practice of applied behavior analysis to enumerated licensed, provisional, temporary, supervised-fieldwork, psychologist, or other scope-of-practice pathways. BCBA certification alone is not represented here as a substitute for Missouri licensure when licensure is otherwise required.",
    roles: ["bcba", "laba"],
    payers: ["commercial", "medicaid", "mo-healthnet", "self-funded", "unknown"],
    effectiveDate: "2018-08-28",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://revisor.mo.gov/main/OneSection.aspx?section=337.315",
    sourceLabel: "Missouri Revisor of Statutes — RSMo 337.315",
    posture: "BLOCK",
  },
  {
    id: "mo-laba-direct-supervision",
    state: "MO",
    domain: "supervision",
    title: "Missouri LaBA practice requires LBA supervision",
    summary: "RSMo 337.315 provides that licensed assistant behavior analysts work under direct supervision of a licensed behavior analyst as established by committee rule.",
    roles: ["laba"],
    payers: ["commercial", "medicaid", "mo-healthnet", "self-funded", "unknown"],
    effectiveDate: "2018-08-28",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://revisor.mo.gov/main/OneSection.aspx?section=337.315",
    sourceLabel: "Missouri Revisor of Statutes — RSMo 337.315",
    posture: "BLOCK",
  },
  {
    id: "mo-healthnet-rbt-90-day",
    state: "MO",
    domain: "medicaid",
    title: "MO HealthNet RBT credential and 90-day grace period",
    summary: "MO HealthNet states that a new behavior technician may render ABA services for up to 90 calendar days after passing the RBT initial competency assessment and must hold the BACB RBT credential by the end of that period to continue providing ABA services to MO HealthNet participants.",
    roles: ["rbt"],
    payers: ["medicaid", "mo-healthnet"],
    effectiveDate: "2026-06-26",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://mydss.mo.gov/mhd/hot-tips/mandatory-rbt-credential-90-day-grace-period-and-billing-compliance-aba",
    sourceLabel: "MO HealthNet — Mandatory RBT Credential, 90-Day Grace Period",
    posture: "BLOCK",
  },
  {
    id: "mo-commercial-autism-376-1224",
    state: "MO",
    domain: "commercial-insurance",
    title: "Missouri autism/ABA insurance mandate applicability",
    summary: "RSMo 376.1224 defines required autism-treatment coverage and ABA provisions for applicable health benefit plans. Plan type, current inflation-adjusted benefit amount, and ERISA/self-funded applicability require plan-level verification before economic assumptions are used.",
    roles: ["client", "organization"],
    payers: ["commercial", "self-funded", "unknown"],
    effectiveDate: "2019-08-28",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://www.revisor.mo.gov/main/OneSection.aspx?section=376.1224",
    sourceLabel: "Missouri Revisor of Statutes — RSMo 376.1224",
    posture: "REVIEW",
  },
  {
    id: "ks-lba-practice-65-7503",
    state: "KS",
    domain: "licensure",
    title: "Kansas ABA practice requires LBA/LaBA or statutory exception",
    summary: "K.S.A. 65-7503 requires persons practicing applied behavior analysis to be a licensed behavior analyst, a licensed assistant behavior analyst under LBA supervision, an eligible supervised trainee, an eligible psychologist, or another statutory exception.",
    roles: ["bcba", "laba"],
    payers: ["commercial", "medicaid", "kancare", "self-funded", "unknown"],
    effectiveDate: "2016-07-01",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://www.ksrevisor.gov/statutes/chapters/ch65/065_075_0003.html",
    sourceLabel: "Kansas Revisor of Statutes — K.S.A. 65-7503",
    posture: "BLOCK",
  },
  {
    id: "ks-laba-supervision",
    state: "KS",
    domain: "supervision",
    title: "Kansas LaBA practice requires LBA supervision",
    summary: "K.S.A. 65-7503 identifies licensed assistant behavior analysts as practicing under supervision of a licensed behavior analyst.",
    roles: ["laba"],
    payers: ["commercial", "medicaid", "kancare", "self-funded", "unknown"],
    effectiveDate: "2016-07-01",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://www.ksrevisor.gov/statutes/chapters/ch65/065_075_0003.html",
    sourceLabel: "Kansas Revisor of Statutes — K.S.A. 65-7503",
    posture: "BLOCK",
  },
  {
    id: "ks-line-therapist-definition",
    state: "KS",
    domain: "supervision",
    title: "Kansas line therapist works under direct LBA supervision",
    summary: "K.S.A. 65-7502 defines a line therapist as implementing prescribed behavioral interventions under direct supervision of a licensed behavior analyst. The app treats technician role mapping and payer billing eligibility as a review item rather than assuming every RBT is automatically billable.",
    roles: ["rbt"],
    payers: ["commercial", "medicaid", "kancare", "self-funded", "unknown"],
    effectiveDate: "2016-07-01",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://www.ksrevisor.gov/statutes/chapters/ch65/065_075_0002.html",
    sourceLabel: "Kansas Revisor of Statutes — K.S.A. 65-7502",
    posture: "REVIEW",
  },
  {
    id: "ks-commercial-autism-40-2-194",
    state: "KS",
    domain: "commercial-insurance",
    title: "Kansas autism/ABA commercial coverage has age/hour rules",
    summary: "K.S.A. 40-2,194 requires autism treatment coverage for applicable plans and includes ABA hour limits: 1,300 hours per calendar year for four years for qualifying children diagnosed from birth through age five, and otherwise 520 hours per calendar year for covered individuals under age 12, with a prior-approval pathway to exceed limits when medically necessary.",
    roles: ["client", "organization"],
    payers: ["commercial", "self-funded", "unknown"],
    effectiveDate: "2015-01-01",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://www.ksrevisor.gov/statutes/chapters/ch40/040_002_0194.html",
    sourceLabel: "Kansas Revisor of Statutes — K.S.A. 40-2,194",
    posture: "REVIEW",
  },
  {
    id: "ks-payer-provider-licensure",
    state: "KS",
    domain: "credentialing",
    title: "Kansas payer reimbursement depends on authorized ABA provider status",
    summary: "Kansas commercial autism coverage ties reimbursement to autism service providers licensed or exempt under the Applied Behavior Analysis Licensure Act, subject to statutory exceptions. Payer-specific network and rendering-provider rules still require verification.",
    roles: ["bcba", "laba", "rbt", "organization"],
    payers: ["commercial", "medicaid", "kancare"],
    effectiveDate: "2016-07-01",
    lastVerifiedAt: "2026-08-28",
    sourceUrl: "https://www.ksrevisor.gov/statutes/chapters/ch40/040_002_0194.html",
    sourceLabel: "Kansas Revisor of Statutes — K.S.A. 40-2,194",
    posture: "REVIEW",
  },
] as const;

export function rulesForContext(context: RegulatoryContext) {
  const payer = context.payer ?? "unknown";
  return REGULATORY_RULES.filter((rule) =>
    rule.state === context.state && rule.roles.includes(context.role) && (rule.payers.includes(payer) || rule.payers.includes("unknown")),
  );
}

export function evaluateRegulatoryContext(context: RegulatoryContext): RegulatoryDecision[] {
  const decisions: RegulatoryDecision[] = [];
  for (const rule of rulesForContext(context)) {
    if (rule.id === "mo-lba-practice-337-315" || rule.id === "ks-lba-practice-65-7503") {
      decisions.push(decision(rule, context.stateLicenseVerified === true ? "PASS" : context.stateLicenseVerified === false ? "BLOCK" : "REVIEW",
        context.stateLicenseVerified === true ? "State licensure was verified." : context.stateLicenseVerified === false ? "Required state licensure was not verified as active." : "Verify the applicable state license or statutory exception before treating this professional as practice-ready."));
      continue;
    }
    if (rule.id === "mo-laba-direct-supervision" || rule.id === "ks-laba-supervision") {
      decisions.push(decision(rule, context.directLbaSupervisionVerified === true ? "PASS" : context.directLbaSupervisionVerified === false ? "BLOCK" : "REVIEW",
        context.directLbaSupervisionVerified === true ? "Direct LBA supervision was verified." : context.directLbaSupervisionVerified === false ? "Required LBA supervision was not verified." : "Verify the supervising LBA and supervision arrangement."));
      continue;
    }
    if (rule.id === "mo-healthnet-rbt-90-day") {
      decisions.push(evaluateMissouriRbt(rule, context));
      continue;
    }
    if (rule.id === "ks-line-therapist-definition") {
      const status: GateStatus = context.directLbaSupervisionVerified === false ? "BLOCK" : context.directLbaSupervisionVerified === true ? "PASS" : "REVIEW";
      decisions.push(decision(rule, status,
        status === "PASS" ? "Direct LBA supervision was verified; payer-specific technician eligibility still needs confirmation." : status === "BLOCK" ? "Direct LBA supervision is not verified." : "Verify direct LBA supervision and payer-specific technician/rendering requirements."));
      continue;
    }
    decisions.push(decision(rule, rule.posture, rule.summary));
  }
  return decisions;
}

function evaluateMissouriRbt(rule: RegulatoryRule, context: RegulatoryContext): RegulatoryDecision {
  if (context.nationalCredentialVerified === true) return decision(rule, "PASS", "Active RBT credential was verified for this context.");
  if (context.nationalCredentialVerified === false && !context.rbtCompetencyAssessmentDate) {
    return decision(rule, "REVIEW", "No active RBT credential is verified. A competency-assessment date is required to determine whether the MO HealthNet grace period applies.");
  }
  if (!context.rbtCompetencyAssessmentDate) return decision(rule, "REVIEW", "Verify RBT credential status or the date of the initial competency assessment.");

  const asOf = parseDate(context.asOf ?? new Date().toISOString());
  const assessment = parseDate(context.rbtCompetencyAssessmentDate);
  if (!asOf || !assessment) return decision(rule, "REVIEW", "The competency-assessment date could not be interpreted reliably.");
  const days = Math.floor((asOf.getTime() - assessment.getTime()) / 86_400_000);
  if (days < 0) return decision(rule, "REVIEW", "The competency-assessment date is in the future relative to the evaluation date.");
  if (days <= 90) return decision(rule, "REVIEW", `The technician is ${days} day(s) from the recorded competency assessment. Verify all MO HealthNet grace-period conditions and obtain the RBT credential by day 90.`);
  return decision(rule, "BLOCK", `The recorded competency assessment is ${days} days old and no active RBT credential is verified. Do not treat the technician as MO HealthNet billing-ready.`);
}

function decision(rule: RegulatoryRule, status: GateStatus, detail: string): RegulatoryDecision {
  return { status, ruleId: rule.id, title: rule.title, detail, sourceUrl: rule.sourceUrl };
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
