import assert from "node:assert/strict";
import {
  ACS_BATCHES, acsMetricsFromRow, collectStateCountyBundle, countyKey, parseCbpRows, parseCensusTable, parseCsv,
  parseHpsaMentalHealthCsv, parseMissouriChildCareStats, parseColoradoChildCareStats, reporterVariableKey, tigerCountyLayerId,
} from "../lib/intelligence/joins/collectors";
import { DATA_JOINS, joinPrograms } from "../lib/intelligence/joins/join-catalog";
import { rankStateCounties, selectCountyReport, LOW_SAMPLE_CHILDREN } from "../lib/intelligence/joins/rank";
import { CBP_NAICS } from "../lib/intelligence/joins/sources";
import { INDICATOR_CATALOG, indicatorDefinition, scoreEngineFromObservations } from "../lib/intelligence/phase3/indicator-catalog";
import { acsVars, byFips, COUNTIES, fixtureFetch, requested } from "./fixtures/county-joins";

// ---------------------------------------------------------------------------
// 1. Catalog contract: 40 joins, each crossing at least two independent data programs.
// ---------------------------------------------------------------------------
assert.equal(DATA_JOINS.length, 40, "Exactly 40 data joins");
assert.deepEqual(DATA_JOINS.map((join) => join.id), Array.from({ length: 40 }, (_, i) => "J" + String(i + 1).padStart(2, "0")));
for (const join of DATA_JOINS) {
  assert(joinPrograms(join).length >= 2, `${join.id} must combine at least two separate data programs`);
  assert(join.title && join.rationale && join.formula && join.unit, `${join.id} must explain itself`);
  if (join.indicator) {
    const definition = indicatorDefinition(join.indicator.id);
    assert(definition, `${join.id} maps to unknown indicator ${join.indicator.id}`);
    assert.equal(join.indicator.value === "supply", definition!.direction === "lower_opportunity",
      `${join.id}: supply-scaled values only for lower_opportunity (ABA supply) indicators`);
  }
}
assert.equal(DATA_JOINS.filter((join) => join.opportunity === "agreement").length, 4, "Four cross-source validation joins");
const crossAgency = DATA_JOINS.filter((join) => joinPrograms(join).some((program) => !program.startsWith("census-")));
assert(crossAgency.length >= 6, "Joins must also cross agencies (HRSA / state licensing), not only Census programs");

// ---------------------------------------------------------------------------
// 2. Pure parsers
// ---------------------------------------------------------------------------
assert.throws(() => parseCensusTable("<html>error</html>"), /non-JSON/);
assert.deepEqual(parseCensusTable('[["NAME","B01003_001E","state","county"],["Boone County, Missouri","185000","29","019"]]'),
  [{ NAME: "Boone County, Missouri", B01003_001E: "185000", state: "29", county: "019" }]);
assert.equal(countyKey("St. Louis city, Missouri"), "stlouiscity");
assert.equal(countyKey("ST LOUIS CITY"), "stlouiscity");
assert.equal(countyKey("Saint Louis County"), "stlouis");
assert.equal(countyKey("DE KALB"), countyKey("DeKalb County, Missouri"));
assert.equal(countyKey("Ste. Genevieve County, Missouri"), countyKey("SAINTE GENEVIEVE"));
assert.deepEqual(parseCsv('a,"b, with comma","say ""hi"""\r\n1,2,3\n'), [["a", "b, with comma", 'say "hi"'], ["1", "2", "3"]]);
assert.equal(tigerCountyLayerId({ layers: [{ id: 0, name: "States" }, { id: 11, name: "Counties" }, { id: 12, name: "Counties Labels" }] }), 11);
const cbpDupes = parseCbpRows([
  { NAME: "A", ESTAB: "4", state: "29", county: "001" },
  { NAME: "A", ESTAB: "9", state: "29", county: "001" },
  { NAME: "B", ESTAB: "x", state: "29", county: "003" },
]);
assert.equal(cbpDupes.get("29001")?.estab, 9, "Size-class rows collapse to the all-establishments total");
assert(!cbpDupes.has("29003"), "Non-numeric ESTAB is dropped, not zeroed");

async function main() {
  // ACS row integrity: a renumbered insurance table is dropped, never used.
  const broken = acsMetricsFromRow(Object.fromEntries(Object.entries(acsVars(byFips.get("29037")!)).map(([k, v]) => [k, String(v)])));
  assert.equal(broken.metrics["acs.u19_medicaid"], undefined);
  assert(broken.issues.some((issue) => issue.includes("B27010")));
  const healthy = acsMetricsFromRow(Object.fromEntries(Object.entries(acsVars(byFips.get("29095")!)).map(([k, v]) => [k, String(v)])));
  assert.deepEqual(healthy.issues, []);
  assert.equal(healthy.metrics["acs.kids"], 160000);
  assert.equal(healthy.metrics["acs.kids_u6"], Math.round(160000 * 0.32));
  assert(ACS_BATCHES.every((batch) => batch.length + 1 <= 50), "Census allows at most 50 variables per request");

  // HPSA: facility and withdrawn designations excluded, other states ignored, absent counties are not invented.
  const hpsaText = await fixtureFetch("29")("https://data.hrsa.gov/x.csv", new AbortController().signal);
  const hpsa = parseHpsaMentalHealthCsv(hpsaText, "29")!;
  assert.deepEqual(Object.fromEntries(hpsa), { "29047": 18, "29213": 21, "29111": 16 });
  assert.equal(parseHpsaMentalHealthCsv("HPSA Name,Other\nx,y", "29"), null, "Unrecognised file is a failure, not 'no shortage'");

  // Licensing statistics: closed sites excluded; county names normalised.
  const mo = parseMissouriChildCareStats({ features: [
    { attributes: { COUNTY: "JACKSON", STATUS: "Active", SITES: 10, CAPACITY: 500 } },
    { attributes: { county: "JACKSON", status: "Revoked", sites: 99, capacity: 900 } },
    { attributes: { COUNTY: "ST. LOUIS CITY", STATUS: "Active", SITES: 3, CAPACITY: 60 } },
  ] });
  assert.deepEqual(mo.get("jackson"), { sites: 10, capacity: 500 });
  assert.deepEqual(mo.get("stlouiscity"), { sites: 3, capacity: 60 });
  assert.deepEqual(parseColoradoChildCareStats([{ county: "Denver", sites: "250", capacity: "18000" }, { county: "Mesa", sites: "40" }]).get("mesa"), { sites: 40, capacity: null });

  // Full statewide collection with year fallbacks.
  const bundle = await collectStateCountyBundle("MO", { fetchText: fixtureFetch("29") });
  const status = Object.fromEntries(bundle.programs.map((program) => [program.program, program]));
  for (const program of ["census-acs5", "census-saipe", "census-sahie", "census-cbp", "census-tiger", "hrsa-hpsa-mh", "state-childcare-licensing"]) {
    assert.equal(status[program]?.status, "complete", `${program} should complete: ${status[program]?.detail}`);
  }
  assert.equal(status["census-acs5"].vintage, "2019–2023", "ACS falls back from 2024 to 2023 when the newer release is unavailable");
  assert.equal(status["census-cbp"].vintage, "2022");
  assert.equal(bundle.frames.length, COUNTIES.length);
  const frame = (fips: string) => bundle.frames.find((item) => item.fips === fips)!;
  assert.equal(frame("29111").metrics["cbp.mh_practices"], 0, "County absent from a successful CBP response has zero establishments");
  assert.equal(frame("29095").metrics["cbp.mh_practices"], 220, "Duplicate size-class rows keep the all-establishments total");
  assert.equal(frame("29095").metrics["hrsa.mh_hpsa_score"], 0, "Facility-only HPSA does not designate the county");
  assert.equal(frame("29047").metrics["hrsa.mh_hpsa_score"], 18);
  assert.equal(frame("29095").metrics["lic.childcare_sites"], 300, "Closed licensing rows are excluded");
  assert.equal(frame("29510").metrics["lic.childcare_sites"], 150, "Independent city matched separately from St. Louis County");
  assert.equal(frame("29189").metrics["lic.childcare_sites"], 420);
  assert.equal(frame("29171").metrics["lic.childcare_sites"], 0);
  assert(Math.abs(frame("29019").metrics["tiger.land_sqmi"]! - 685) < 0.01);
  assert.equal(frame("29037").metrics["acs.u19"], undefined, "Integrity failure keeps bad ACS insurance data out");
  assert(bundle.integrityIssues.some((issue) => issue.startsWith("Cass County")));

  // Ranking
  const ranking = rankStateCounties(bundle);
  assert.equal(ranking.totals.joins, 40);
  assert.equal(ranking.totals.crossProgramJoins, 40);
  const top = ranking.counties[0];
  assert.equal(top.name, "Clay County, Missouri", `Designed service-gap county should rank first, got ${top.name}`);
  assert.equal(top.rank, 1);
  assert(top.drivers.length > 0 && top.drivers.every((text) => /top \d+% of Missouri counties/.test(text)));
  for (const county of ranking.counties) {
    if (county.score !== null) assert(county.score >= 0 && county.score <= 100);
    assert(county.confidence >= 0 && county.confidence <= 100);
    assert.equal(county.joins.length, 40);
    for (const result of county.joins) {
      if (result.percentile !== null) assert(result.percentile >= 0 && result.percentile <= 100);
      if (result.status === "insufficient_data") assert.equal(result.percentile ?? result.agreement, null);
    }
    for (const observation of county.observations) {
      assert(indicatorDefinition(observation.indicatorId), `Unknown indicator ${observation.indicatorId}`);
      assert(observation.value >= 0 && observation.value <= 100);
      assert(observation.confidence >= 30 && observation.confidence <= 85);
    }
  }
  const ranked = ranking.counties.filter((county) => county.rank !== null);
  assert.deepEqual(ranked.map((county) => county.rank), ranked.map((_, index) => index + 1));
  const sorted = [...ranked].sort((a, b) => b.score! - a.score!);
  assert.deepEqual(ranked.map((county) => county.score), sorted.map((county) => county.score));

  const putnam = ranking.counties.find((county) => county.name.startsWith("Putnam"))!;
  assert(putnam.lowSample && putnam.children! < LOW_SAMPLE_CHILDREN);
  assert(putnam.cautions.some((text) => text.includes("margins of error")));
  assert.equal(putnam.joins.find((join) => join.id === "J13")!.raw, 0, "A complete statewide roster with no rows for a county is a real zero");
  assert.equal(putnam.joins.find((join) => join.id === "J26")!.status, "insufficient_data", "Licensed capacity is never invented for a county without roster rows");

  const taney = ranking.counties.find((county) => county.name.startsWith("Taney"))!;
  assert.equal(taney.joins.find((join) => join.id === "J22")!.status, "insufficient_data", "Survey and model disagree by >4 points → no insured consensus");
  assert(taney.joins.find((join) => join.id === "J38")!.agreement! < 40, "Disagreement is surfaced as low agreement");

  const cass = ranking.counties.find((county) => county.name.startsWith("Cass"))!;
  for (const id of ["J19", "J20", "J22", "J25", "J38", "J39"]) {
    assert.equal(cass.joins.find((join) => join.id === id)!.status, "insufficient_data", `${id} needs the dropped ACS insurance table`);
  }

  const stLouisCounty = ranking.counties.find((county) => county.name.startsWith("St. Louis County"))!;
  assert.equal(stLouisCounty.joins.find((join) => join.id === "J10")!.raw, 0, "A well-supplied county is 0 miles from adequate supply");
  const lewisDistance = ranking.counties.find((county) => county.name.startsWith("Lewis"))!.joins.find((join) => join.id === "J10")!.raw!;
  assert(lewisDistance > 50, "Remote zero-supply county is far from adequate supply");

  // Indicator integration: joins fill base-model indicators the keyword scan never reaches.
  const clayIds = new Set(top.observations.map((observation) => observation.indicatorId));
  for (const id of ["aba-supply.01", "aba-supply.06", "referral-ecosystem.01", "referral-ecosystem.07", "payer-economics.09", "payer-economics.10", "access-geography.04", "demographic-demand.06", "evidence-quality.08"]) {
    assert(clayIds.has(id), `Clay County should observe ${id}`);
  }
  const before = scoreEngineFromObservations("client", []);
  const after = scoreEngineFromObservations("client", top.observations);
  assert(after.observedIndicators >= 14 && after.coverage > before.coverage, "Joins raise client-model coverage");
  assert(INDICATOR_CATALOG.length >= 300);

  // Strict geography: never borrow a county's numbers for a city request.
  assert.equal(selectCountyReport(ranking, "Clay County, MO").report?.fips, "29047");
  assert.equal(selectCountyReport(ranking, "St. Louis city").report?.fips, "29510");
  assert.equal(selectCountyReport(ranking, "St. Louis County, Missouri").report?.fips, "29189");
  assert.equal(selectCountyReport(ranking, "Kansas City, MO").report, null);
  const suggestion = selectCountyReport(ranking, "Boone, MO");
  assert.equal(suggestion.report, null);
  assert.deepEqual(suggestion.suggestions, ["Boone County"]);

  // Keyless path: Census Reporter serves ACS when the Census Data API rejects keyless requests.
  assert.equal(reporterVariableKey("B09001001"), "B09001_001E");
  assert.equal(reporterVariableKey("C16002013"), "C16002_013E");
  const keyless = await collectStateCountyBundle("MO", { fetchText: fixtureFetch("29", { keylessReporter: true }) });
  const keylessAcs = keyless.programs.find((program) => program.program === "census-acs5")!;
  assert.equal(keylessAcs.status, "complete", keylessAcs.detail);
  assert(keylessAcs.detail.includes("Census Reporter") && keylessAcs.vintage === "2019–2023");
  const kf = keyless.frames.find((item) => item.fips === "29095")!;
  assert.equal(kf.metrics["acs.kids"], 160000);
  assert.equal(kf.metrics["acs.kids_prior"], frame("29095").metrics["acs.kids_prior"], "Prior vintage also served keylessly");
  assert.equal(kf.metrics["acs.u19_medicaid"], frame("29095").metrics["acs.u19_medicaid"], "Same metrics as the Census Data API path");
  assert.match(keyless.programs.find((program) => program.program === "census-saipe")!.detail, /non-JSON response: "Invalid Key"/, "API rejections name the cause");

  // Failure modes: an unavailable program degrades joins to insufficient_data, never to invented values.
  const noHpsa = rankStateCounties(await collectStateCountyBundle("MO", { fetchText: fixtureFetch("29", { failHpsa: true }) }));
  assert.equal(noHpsa.programs.find((program) => program.program === "hrsa-hpsa-mh")!.status, "unavailable");
  for (const county of noHpsa.counties) for (const id of ["J08", "J33"]) {
    assert.equal(county.joins.find((join) => join.id === id)!.status, "insufficient_data");
  }
  assert(noHpsa.counties[0].rank === 1, "Ranking still works on the remaining 34+ joins");

  const timedOut = await collectStateCountyBundle("MO", { fetchText: fixtureFetch("29", { hangAll: true }), timeoutMs: 50 });
  assert(timedOut.programs.filter((program) => program.status === "unavailable").length >= 6);
  assert.equal(timedOut.frames.length, 0);
  assert.equal(rankStateCounties(timedOut).totals.ranked, 0);

  // Kansas: no statewide licensing roster integrated → explicit not_applicable, CBP child-care join still runs.
  const kansas = await collectStateCountyBundle("KS", { fetchText: fixtureFetch("20") });
  assert.equal(kansas.programs.find((program) => program.program === "state-childcare-licensing")!.status, "not_applicable");
  const ksRanking = rankStateCounties(kansas);
  assert(ksRanking.counties.every((county) => county.joins.find((join) => join.id === "J13")!.status === "insufficient_data"));
  assert(ksRanking.counties.some((county) => county.joins.find((join) => join.id === "J14")!.status === "computed"));
  assert(!requested.some((url) => url.includes("gis.mo.gov") && url.includes("state:20")));

  // Privacy boundary: area-level only.
  const keys = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) { keys.add(key); walk(child); }
  };
  walk(ranking);
  assert(![...keys].some((key) => /address|phone|email|household_?id|person|patient|diagnos|child_?name/i.test(key)),
    "Join output fields are area-level aggregates only");
  assert.equal(CBP_NAICS.length, 10);

  console.log(`Data joins verified: 40 cross-program joins, ${ranking.totals.ranked}/${ranking.totals.counties} fixture counties ranked, ` +
    `top = ${top.name} (${top.score}/100, confidence ${top.confidence}), client coverage ${before.coverage}% → ${after.coverage}% from joins alone.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
