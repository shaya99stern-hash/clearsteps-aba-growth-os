/**
 * Real live-source smoke: deliberately logs failures as failures; it never
 * substitutes fixtures or invented provider counts.
 * External hosts may intermittently block CI; kept non-gating in workflow.
 */
import { fetchCensusReporterDemographics } from "../lib/intelligence/official/census-reporter";
import { fetchSingleAgeCountyPopulation } from "../lib/intelligence/official/census-county-single-age";
import { searchColoradoChildCare } from "../lib/intelligence/official/co-childcare";
import { searchPublicWeb } from "../lib/intelligence/free-search";

const checks = await Promise.allSettled([
  fetchCensusReporterDemographics({state:"MO",location:"Missouri"}),
  fetchSingleAgeCountyPopulation({state:"CO",location:"Denver County, CO"}),
  searchColoradoChildCare("Denver, CO", 5),
  searchPublicWeb("site:dese.mo.gov child care referral Missouri", 3),
]);
const names=["Census Reporter ACS Missouri","2025 official county exact ages 2–18","Colorado CDEC official institutions","Public keyless site search"];
let passed=0;
for (let index=0;index<checks.length;index++) {
  const result=checks[index];
  if (result.status==="rejected") {
    console.error("LIVE SOURCE UNAVAILABLE:",names[index],String(result.reason));
    continue;
  }
  const value=result.value;
  if (index===0) {
    const under18=(value as Awaited<ReturnType<typeof fetchCensusReporterDemographics>>).metrics.under18;
    if (under18<=0) {console.error("LIVE SOURCE INVALID",names[index],"under18 nonpositive");continue;}
    console.log("LIVE SOURCE OK:",names[index],"under18",under18);
  } else if(index===1) {
    const ageTotal=(value as Awaited<ReturnType<typeof fetchSingleAgeCountyPopulation>>).metrics.ages2to18;
    if(!ageTotal || ageTotal<=0) {console.error("LIVE SOURCE INVALID:",names[index],"missing exact 2-18 population");continue;}
    console.log("LIVE SOURCE OK:",names[index],"public estimated population ages 2-18",ageTotal);
  } else {
    const count=(value as unknown[]).length;
    if (count===0) {console.error("LIVE SOURCE EMPTY:",names[index]);continue;}
    console.log("LIVE SOURCE OK:",names[index],"public records",count);
  }
  passed++;
}
console.log("Live independent acquisition success:",passed,"of",checks.length);
if (passed===0) process.exitCode=1;
