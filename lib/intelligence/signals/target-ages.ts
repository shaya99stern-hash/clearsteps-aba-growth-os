/** Age filter for public INSTITUTIONAL service and aggregate area research, never individuals. */
export const SERVICE_AGE_MIN = 2;
export const SERVICE_AGE_MAX = 18;

export type PublicAgeFit = "explicit_target" | "target_subset" | "mixed_ages" | "outside" | "unspecified";
const SCHOOL_CUES = /\b(preschool|pre-?k|kindergarten|elementary school|middle school|high school|school[- ]age|after[- ]school|k[-– ]?12|teen(?:ager)?s?|adolescents?)\b/i;
const UNDERAGE = /\b(infants?|newborns?|birth[- ]to[- ]three|birth through 3|ages? 0[-– ]2|ages? 0[-– ]3|under age 2|ages? under 2)\b/i;
const ADULT = /\b(adults? (?:ages?|services?|program)|ages? 19\+|ages? 21\+|seniors?|geriatric|college[- ]age)\b/i;

export function assessPublicAgeFit(input: string): PublicAgeFit {
  const text = input.slice(0, 3000);
  // A simple explicit numeric age interval must fit completely inside 2–18.
  const ranges = [...text.matchAll(/\b(?:ages?|age range|serving ages?)\s*:?\s*(\d{1,2})\s*(?:[-–—]|to|through)\s*(\d{1,2})\b/gi)];
  if (ranges.length) {
    const numeric = ranges.map((m) => [Number(m[1]), Number(m[2])] as const);
    const contained = numeric.filter(([min, max]) => min >= SERVICE_AGE_MIN && max <= SERVICE_AGE_MAX && min <= max);
    if (contained.length && contained.length === numeric.length) {
      return contained.some(([min, max]) => min === SERVICE_AGE_MIN && max === SERVICE_AGE_MAX)
        ? "explicit_target" : "target_subset";
    }
    if (numeric.every(([min,max]) => max < SERVICE_AGE_MIN || min > SERVICE_AGE_MAX)) return "outside";
    return "mixed_ages";
  }
  if (UNDERAGE.test(text) || ADULT.test(text)) return SCHOOL_CUES.test(text) ? "mixed_ages" : "outside";
  return SCHOOL_CUES.test(text) ? "target_subset" : "unspecified";
}

/** Only unambiguous age-aligned institutional references can corroborate in-scope service claims. */
export function isAgeAlignedPublicProgram(text: string): boolean {
  const fit = assessPublicAgeFit(text);
  return fit === "explicit_target" || fit === "target_subset";
}

/**
 * ACS B09001 age 0-2 is inseparable and omits 18-year-olds.
 * Use measured 3-17 bands only; don't invent an exact 2-18 population.
 */
export function safeMeasuredPopulation3To17(input: {
  age3to5: number; age6to11: number; age12to17: number;
}): { ages3to17: number; exactAge2to18: null; note: string } {
  const values = [input.age3to5,input.age6to11,input.age12to17];
  if (values.some((n) => !Number.isFinite(n) || n < 0)) throw new Error("Invalid public age-band estimate");
  return {
    ages3to17: values.reduce((a,b) => a + b, 0),
    exactAge2to18: null,
    note: "Measured ACS ages 3-17 only; ages 2 and 18 require single-year age data, not interpolation.",
  };
}
