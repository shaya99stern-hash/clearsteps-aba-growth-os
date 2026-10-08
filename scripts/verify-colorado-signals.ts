import assert from "node:assert/strict";
import { INDICATOR_CATALOG, INDICATOR_PILLARS } from "../lib/intelligence/phase3/indicator-catalog";
import { PUBLIC_SIGNAL_RULES, CROSS_SOURCE_CHECKS } from "../lib/intelligence/signals/extended-catalog";
import { scanPublicSignals } from "../lib/intelligence/signals/public-signal-scan";
import {
  parseColoradoChildCare, coloradoWhere, coloradoChildCareObservations,
  coloradoChildCareToSearchHits,
} from "../lib/intelligence/official/co-childcare";
import { stateSourceSelection } from "../lib/intelligence/official/state-source-selection";
import { scoutStateSourceDescriptor } from "../lib/intelligence/official/scout-state-source";
import { REGULATORY_RULES } from "../lib/intelligence/phase3/regulatory-rules";
import type { PublicSearchHit } from "../lib/intelligence/source-types";

assert.equal(INDICATOR_PILLARS.length, 30);
assert.equal(INDICATOR_CATALOG.length, 300);
assert.equal(new Set(INDICATOR_CATALOG.map((x) => x.id)).size, 180);
assert.equal(PUBLIC_SIGNAL_RULES.length, 60);
assert.equal(CROSS_SOURCE_CHECKS.length, 20);
assert.equal(new Set(CROSS_SOURCE_CHECKS.map((x) => x.id)).size, 20);
assert.equal(coloradoWhere("Denver, Colorado"), "state = 'CO' AND upper(city) = 'DENVER'");
assert.equal(coloradoWhere("Boulder County, Colorado"), "state = 'CO' AND upper(county) = 'BOULDER'");
assert.equal(coloradoWhere("80202"), "zip = '80202'");
const providers = parseColoradoChildCare([
  {provider_id:1,provider_name:"Licensed Preschool",provider_service_type:"Preschool",state:"CO",city:"Denver",county:"Denver",total_licensed_capacity:100},
  {provider_id:2,provider_name:"Family Home",provider_service_type:"Family Child Care Home",state:"CO",city:"Denver",county:"Denver",total_licensed_capacity:6},
  {provider_id:3,provider_name:"Outside State",provider_service_type:"Preschool",state:"MO",city:"Kansas City"},
]);
assert.equal(providers.length,1,"Residential home facilities and out-of-state records must be excluded");
assert.equal(coloradoChildCareToSearchHits(providers,"Denver")[0].sourceId, "co-cdec-licensed-childcare");
assert.equal(coloradoChildCareObservations(providers,1000,true).length,1);
assert.equal(coloradoChildCareObservations(providers,1000,false).length,0,"Statewide sample must not receive misleading local density");
assert.equal(stateSourceSelection("CO","client").coloradoChildCare,true);
assert.equal(stateSourceSelection("CO","bcba").coloradoChildCare,false);
assert.equal(scoutStateSourceDescriptor("CO","client")?.source,"Colorado CDEC Licensed Child Care");
assert(REGULATORY_RULES.some((r) => r.id === "co-future-analyst-license" && r.effectiveDate === "2028-07-01"));

function hit(host:string,title:string):PublicSearchHit {
 return {title, snippet:title, url:"https://"+host+"/public-program",query:"public institutional market evidence",sourceId:"public-web",rank:1};
}
const lonely = scanPublicSignals([hit("one.gov","ABA waitlist")]);
assert.equal(lonely.observations.length,0,"Single clue must not create an opportunity score");
const corroborated=scanPublicSignals([
 hit("agency.gov","ABA waitlist; early childhood shortage"),
 hit("newspaper.com","ABA waitlist; early childhood shortage"),
 hit("clinic.org","ABA waitlist"),
 hit("regionalnews.net","early childhood shortage"),
]);
assert(corroborated.observations.some(x=>x.indicatorId==="service-capacity.01"));
assert(corroborated.observations.some(x=>x.indicatorId==="institutional-demand.10"));
assert.equal(corroborated.crossChecks.find(x=>x.id==="X01")?.status,"supported");
assert.equal(corroborated.crossChecks.length,20);
const privateClue=scanPublicSignals([
 hit("forum.org","My autistic son lives at our house on 123 Main Street; ABA waitlist"),
]);
assert.equal(privateClue.clues.length,0,"Household-level signals must not be included");
console.log("Colorado institutional collector, 60 signals, 20 cross-checks and privacy checks passed.");
