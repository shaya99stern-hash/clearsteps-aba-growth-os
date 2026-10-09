/**
 * Live, non-gating smoke test for the county data joins (runs in CI, which has open internet).
 * 1. Confirms every ACS variable used still carries the expected Census label (catches renumbered tables).
 * 2. Collects and ranks every county in each state from the real public programs, reporting what responded.
 */
import { ACS_EXPECTED_LABELS, collectStateCountyBundle } from "../lib/intelligence/joins/collectors";
import { rankStateCounties } from "../lib/intelligence/joins/rank";
import type { JoinState } from "../lib/intelligence/joins/sources";
import { collectStateTracts } from "../lib/intelligence/geo/tracts";
import { collectSitePlaces } from "../lib/intelligence/geo/places";
import { analyzeSite } from "../lib/intelligence/geo/site-analysis";

const ACS_YEAR = 2023;
let failures = 0;

async function checkLabels() {
  for (const [variable, fragments] of Object.entries(ACS_EXPECTED_LABELS)) {
    const group = variable.slice(0, variable.indexOf("_"));
    const url = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5/variables/${variable}.json`;
    try {
      const response = await fetch(url, { headers: { "user-agent": "ClearStepsResearch/1.0 (+smoke)" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const meta = await response.json() as { label?: string; concept?: string };
      const label = (meta.label ?? "").replace(/!!/g, " | ");
      const missing = fragments.filter((fragment) => !label.toLowerCase().includes(fragment.toLowerCase()));
      if (missing.length) {
        failures++;
        console.error(`LABEL MISMATCH ${variable} (${group}): "${label}" lacks ${missing.map((m) => `"${m}"`).join(", ")}`);
      } else console.log(`label ok  ${variable}: ${label}`);
    } catch (error) {
      failures++;
      console.error(`label fetch failed ${variable}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

async function checkState(state: JoinState) {
  const started = Date.now();
  const bundle = await collectStateCountyBundle(state, { timeoutMs: 40_000 });
  const ranking = rankStateCounties(bundle);
  console.log(`\n${state}: ${ranking.totals.counties} counties, ${ranking.totals.ranked} ranked in ${Date.now() - started} ms`);
  for (const program of ranking.programs) console.log(`  ${program.status.padEnd(14)} ${program.program} ${program.vintage ?? ""} — ${program.detail}`);
  if (ranking.integrityIssues.length) console.log(`  integrity drops: ${ranking.integrityIssues.length} (first: ${ranking.integrityIssues[0]})`);
  for (const county of ranking.counties.slice(0, 5)) {
    console.log(`  #${county.rank} ${county.name} ${county.score}/100 conf ${county.confidence} joins ${county.computedJoins}/40`);
    for (const driver of county.drivers) console.log(`      ${driver}`);
  }
  const perJoin = ranking.counties.length
    ? Array.from({ length: 40 }, (_, i) => ranking.counties.filter((county) => county.joins[i].status === "computed").length)
    : [];
  const empty = perJoin.map((n, i) => (n === 0 ? `J${String(i + 1).padStart(2, "0")}` : null)).filter(Boolean);
  if (empty.length) console.log(`  joins with no county computed: ${empty.join(", ")}`);
  if (ranking.totals.ranked === 0) failures++;
}

async function main() {
  await checkLabels();
  for (const state of ["MO", "KS", "CO"] as const) {
    try {
      await checkState(state);
    } catch (error) {
      failures++;
      console.error(`${state} failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  // Live 2/5/10-mile site analysis around downtown Kansas City, MO.
  try {
    const center = { lat: 39.0997, lon: -94.5786 };
    const [tracts, places] = await Promise.all([collectStateTracts("MO", { timeoutMs: 40_000 }), collectSitePlaces("MO", center, { timeoutMs: 40_000 })]);
    console.log(`\nSite: ${tracts.tracts.length} MO tracts; ${places.places.length} organization pins within 10 mi`);
    for (const program of tracts.programs) console.log(`  ${program.status.padEnd(14)} ${program.program} (tracts) — ${program.detail}`);
    for (const source of places.sources) console.log(`  ${source.status.padEnd(14)} ${source.source} — ${source.detail}`);
    const analysis = analyzeSite(center, { tracts: tracts.tracts, places });
    console.log(`  ${analysis.indicators.filter((item) => item.value !== null).length}/${analysis.indicators.length} indicators; ${analysis.daycares.length} child-care facilities (${analysis.daycares.filter((d) => d.tier === "priority").length} priority); convergence ${analysis.convergence.passed}/${analysis.convergence.evaluated}`);
    for (const ring of analysis.rings) console.log(`  ${ring.radiusMiles} mi: ${ring.children} children, ${ring.childrenUnder6} under 6, ${ring.licensedDaycares} licensed child care, ${ring.abaProviders} ABA orgs`);
    if (!tracts.tracts.length || !places.places.length) failures++;
  } catch (error) {
    failures++;
    console.error(`site analysis failed: ${error instanceof Error ? error.message : error}`);
  }

  if (failures) {
    console.error(`\n${failures} live data-join check(s) failed`);
    process.exit(1);
  }
  console.log("\nLive county data joins: labels verified and every state ranked.");
}

main();
