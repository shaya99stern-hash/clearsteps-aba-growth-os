import assert from "node:assert/strict";
import { ABA_COMMON_MISSPELLINGS, ABA_LEXICON, understandAbaRequest } from "../lib/intelligence/aba-language";
import { buildSearchPlan } from "../lib/intelligence/query-planner";
import { evaluateResearchRequest } from "../lib/intelligence/request-policy";

const aliases = ABA_LEXICON.reduce((count, entry) => count + entry.variants.length, 0);
assert(ABA_LEXICON.length >= 40, "ABA language catalog must cover substantive operator concepts");
assert(aliases >= 300, "ABA domain dictionary should include at least 300 phrase aliases");
assert(new Set(ABA_LEXICON.map((entry) => entry.id)).size === ABA_LEXICON.length);
assert(Object.keys(ABA_COMMON_MISSPELLINGS).length >= 70, "Common errors should include ABA jargon and spelling variants");

const typoCases = [
  ["pediatrition", "pediatrician"],
  ["refferals", "referrals"],
  ["referal", "referral"],
  ["autsim", "autism"],
  ["autstic", "autistic"],
  ["whaitlist", "waitlist"],
  ["speach", "speech"],
  ["recruting", "recruiting"],
  ["bcbba", "bcba"],
  ["rbtt", "rbt"],
  ["insurence", "insurance"],
  ["reimbrusement", "reimbursement"],
  ["devlopmental", "developmental"],
  ["cencus", "census"],
  ["famlies", "families"],
  ["adress", "address"],
] as const;
for (const [misspelled, corrected] of typoCases) {
  const reading = understandAbaRequest("Find ABA " + misspelled + " in Kansas City", "client");
  assert(reading.corrected.split(" ").includes(corrected), misspelled + " must correct to " + corrected);
  assert(reading.corrections.some((item) => item.from === misspelled), misspelled + " must be auditable");
}

for (const [phrase, expected] of [
  ["find more clients", "client_acquisition"],
  ["get more families for my ABA agency", "client_acquisition"],
  ["local pediatrician referral sources", "client_acquisition"],
  ["hire registered behavior technicians", "rbt_recruiting"],
  ["board certified behavior analyst vacancies", "bcba_recruiting"],
  ["BCBA pay in Colorado", "bcba_recruiting"],
  ["research Medicaid rates", "public_market_research"],
] as const) {
  assert.equal(understandAbaRequest(phrase).interpretedGoal, expected, phrase);
}

const clinic = understandAbaRequest('Find referrals from "Bryght Kids Clinic" on 10th Avenue, Denver 80202', "client");
assert(clinic.corrected.includes("bryght kids clinic"), "quoted organization brand should be preserved");
assert(clinic.corrected.includes("80202"), "ZIP numbers must never be fuzzy-corrected");
assert(!clinic.corrections.some((term) => term.from === "bryght"), "proper brand should not be silently rewritten");

const explicitClients = understandAbaRequest("Don't look for ABA partners; I need new CLIENTS, ages 2–18", "client");
assert.equal(explicitClients.interpretedGoal, "client_acquisition");
assert(explicitClients.warnings.some((warning) => warning.includes("excluded")), "negative partnership intent must be respected");
const parallel = understandAbaRequest("Find new families and recruit RBTs in Missouri", "client");
assert(parallel.warnings.some((warning) => warning.includes("supporting context")), "mixed client and staffing terms need a warning");

const correctedPlan = buildSearchPlan("Find pediatrition refferals and whaitlists for ABA kids", "Kansas City, MO", "client", "MO");
assert.equal(correctedPlan.input, "Find pediatrition refferals and whaitlists for ABA kids", "original must remain audit-visible");
assert(correctedPlan.interpretation.corrections.length >= 3);
assert(correctedPlan.lanes.includes("referral"));
assert(correctedPlan.lanes.includes("community"));
assert(correctedPlan.queries.some((row) => /pediatrician|pediatric/.test(row.query)));
assert(correctedPlan.queries.some((row) => /waitlist|wait list/.test(row.query)));
assert(correctedPlan.queries.length <= 20, "search budget must be bounded");
assert(!correctedPlan.lanes.includes("talent"), "Client research should not switch itself to recruiting");

const jobsPlan = buildSearchPlan("Need RBT technicians and jobs, not new ABA partnerships", "Wichita, KS", "rbt", "KS");
assert.deepEqual(jobsPlan.lanes, ["talent", "market"]);
assert(jobsPlan.queries.some((row) => /RBT/i.test(row.query)));

assert(evaluateResearchRequest("Find ABA waitlists and preschool referral agencies").allowed, "public market research is allowed");
assert(evaluateResearchRequest("Find pediatric office addresses for autism service referrals").allowed, "legitimate professional addresses are allowed");
assert.equal(evaluateResearchRequest("find autstic kids home adress in denver").allowed, false, "obfuscated individual targeting must be blocked");
assert.equal(evaluateResearchRequest("find children with autism and their home address").allowed, false);
assert.equal(evaluateResearchRequest("Find named ABA agency competitors and public reviews").allowed, true);
assert.equal(evaluateResearchRequest("Find child development organizations, not individual families").allowed, true);

console.log("ABA language regression passed: " + ABA_LEXICON.length + " concepts, " + aliases + " phrase aliases, " + Object.keys(ABA_COMMON_MISSPELLINGS).length + " common spelling corrections.");
