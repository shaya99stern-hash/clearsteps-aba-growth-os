import assert from "node:assert/strict";
import { buildClientGrowthPlan,clientGrowthTaskBrief } from "../lib/intelligence/client-growth";
const baseline={state:"CO" as const,location:"Denver County, CO",ageBand:"2-18" as const,
  demographics:{geographyName:"Denver County, Colorado",geographyKind:"county",year:2025,
    metrics:{ages2to18:124416,age3to5:18000,age6to11:40000,age12to17:47000}},
  publicClues:[]};
const a=buildClientGrowthPlan(baseline);
assert.equal(a.mode,"family_acquisition");
assert.equal(a.verifiedTargetPopulation,124416);
assert.equal(a.demandStatus,"unverified");
assert.equal(a.staffReady,"unverified");
assert.equal(a.secureIntakeReady,false);
assert.equal(a.directFamilyInquiries,0);
assert.equal(a.ageQualifiedFamiliesFound,0);
assert.equal(a.actions.length,5);
assert(a.actions.some((x)=>x.id==="activate_intake" && x.url===null));
assert(a.actions.some((x)=>x.id==="staff_capacity" && x.url==="/talent"));
assert(!a.actions.some((x)=>/ABA partnership|competitor as client|scrape/i.test(x.description)));
assert(a.actions.filter((x)=>x.url?.startsWith("https://www.google.com/search")).length>=2);
assert(a.actions.find((x)=>x.id==="local_service_page")?.url?.includes("Denver+County"));
const city=buildClientGrowthPlan({...baseline,location:"Denver, CO",demographics:{...baseline.demographics,geographyKind:"place"}});
assert.equal(city.verifiedTargetPopulation,null,"Do not attribute county-sized child population to a city");
const teens=buildClientGrowthPlan({...baseline,ageBand:"12-18"});
assert.equal(teens.verifiedTargetPopulation,null,"Single-year aggregate ages 2–18 is not ages 12–18");
assert.match(teens.actions.find((x)=>x.id==="local_service_page")?.description??"",/adolescents ages 12–18/);
const signal={indicatorId:"service-capacity.01",corroborated:true,sourceDomains:["district.gov","news.example.org"]};
const evidenced=buildClientGrowthPlan({...baseline,publicClues:[signal]});
assert.equal(evidenced.demandStatus,"documented_public_capacity_signal");
const fakePublisher=buildClientGrowthPlan({...baseline,publicClues:[{
 indicatorId:"service-capacity.01",corroborated:true,sourceDomains:["one.example.com","two.example.com"]
}]});
assert.equal(fakePublisher.demandStatus,"unverified","Multiple subdomains cannot corroborate capacity");
const uncorroborated=buildClientGrowthPlan({...baseline,publicClues:[{...signal,corroborated:false}]});
assert.equal(uncorroborated.demandStatus,"unverified");
const brief=clientGrowthTaskBrief(a);
assert(brief.includes("Denver County, CO"));
assert(brief.includes("Secure") || brief.includes("secure"));
assert(brief.includes("RBT"));
assert(!brief.includes("New client leads: 124416"),"Population is not a client count");
assert(!JSON.stringify(a).includes("family email"),"No personal family data or contact harvesting");
console.log("Client-first acquisition verified: territory, correct age population, no fabricated families, source independence, secure intake gate and RBT coverage.");
