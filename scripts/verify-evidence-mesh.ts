import assert from "node:assert/strict";
import { assessOpportunityReliability } from "../lib/intelligence/score-reliability";
import { parseNppesResponse } from "../lib/intelligence/official/nppes-live";
import { KANSAS_PUBLISHED_PROGRAMS } from "../lib/intelligence/official/ks-roster-snapshot";
import { buildKansasEarlyInterventionObservations } from "../lib/intelligence/official/ks-early-intervention";
import { buildStateSourceContribution } from "../lib/intelligence/official/state-source-contribution";
import { PUBLIC_SOURCE_CHANNELS, choosePublicSourceChannels, matchedPublicSourceChannels } from "../lib/intelligence/signals/source-channel-catalog";
import { buildSearchPlan } from "../lib/intelligence/query-planner";
import { scanPublicSignals, matchesPublicTerritory } from "../lib/intelligence/signals/public-signal-scan";
import { buildLeadEvidenceGraph } from "../lib/intelligence/signals/lead-evidence-graph";
import { parseCensusReporterData, chooseCensusReporterGeo } from "../lib/intelligence/official/census-reporter";
import { parseBingRss } from "../lib/intelligence/free-search";
import type { SearchEvidence } from "../lib/intelligence/source-types";

assert(PUBLIC_SOURCE_CHANNELS.length >= 75, "Real public-source catalog must contain at least 75 addressable channels");
assert.equal(new Set(PUBLIC_SOURCE_CHANNELS.map((x) => x.host)).size, PUBLIC_SOURCE_CHANNELS.length);
assert(choosePublicSourceChannels("CO", "client", "Denver").some((x) => x.scope === "CO"));
assert(choosePublicSourceChannels("KS", "rbt", "Overland Park").every((x) => ["KS","federal","national"].includes(x.scope)));
assert.deepEqual(matchedPublicSourceChannels(["https://cdec.colorado.gov/program", "https://www.facebook.com/public", "https://unknown.test"]), ["cdec.colorado.gov","facebook.com"]);

const plan=buildSearchPlan("find public referral organizations", "Denver, CO", "client","CO");
assert(plan.queries.some((row)=>row.query.startsWith("site:")), "Engine must actually schedule registered source discovery");
assert(plan.queries.some((row)=>row.query.includes("Denver")), "All public source searches must contain locality");

assert.equal(matchesPublicTerritory("Published Denver ABA waitlist", "Denver, CO"),true);
assert.equal(matchesPublicTerritory("Published Boulder ABA waitlist", "Denver, CO"),false);
assert.equal(matchesPublicTerritory("80202 public resource", "80202"),true);
assert.equal(matchesPublicTerritory("Different ZIP 80203", "80202"),false);
const hit=(host:string, snippet:string)=>({
  title:"ABA waitlist program", snippet, url:"https://"+host+"/public", query:"research Denver CO", sourceId:"duckduckgo-html", rank:1,
});
const misleading=scanPublicSignals([hit("one.gov","ABA waitlist in Boulder"), hit("localnews.com","ABA waitlist in Boulder")], "2026-10-08", "Denver, CO");
assert.equal(misleading.observations.length,0, "Cross-source agreement without geographic evidence must never score");
const localized=scanPublicSignals([hit("one.gov","ABA waitlist in Denver for local schools"), hit("localnews.com","ABA waitlist in Denver at regional child clinic")], "2026-10-08", "Denver, CO");
assert(localized.observations.some(x=>x.indicatorId==="service-capacity.01"));

const geoResult={results:[{full_geoid:"16000US0820000",full_name:"Denver, CO",sumlevel:"160"},{full_geoid:"16000US2940000",full_name:"Denver, MO",sumlevel:"160"}]};
assert.equal(chooseCensusReporterGeo(geoResult,"Denver","CO","160")?.full_geoid,"16000US0820000");
assert.equal(chooseCensusReporterGeo(geoResult,"Denver","KS","160"),null);
const geoid="04000US08";
const metrics=parseCensusReporterData({data:{[geoid]:{
 B01003:{estimate:{B01003001:1000}},
 B09001:{estimate:{B09001001:260,B09001003:30,B09001004:20,B09001005:10,B09001006:60,B09001007:50,B09001008:40,B09001009:40}},
}},geography:{[geoid]:{name:"Colorado"}}},geoid);
assert.equal(metrics.metrics.under18,260);
assert.equal(metrics.metrics.age0to2,30);
assert.equal(metrics.metrics.age3to5,30);
assert.equal(metrics.metrics.age6to11,110);
assert.equal(metrics.metrics.age12to17,80);
assert.throws(()=>parseCensusReporterData({data:{[geoid]:{B01003:{estimate:{B01003001:1000}}}}},geoid),/complete/);

const rss="<rss><channel><item><title>Public ABA clinic</title><link>https://provider.org/updates</link><description>New Denver care</description></item></channel></rss>";
const parsed=parseBingRss(rss,"aba Denver");
assert.equal(parsed.length,1);
assert.equal(parsed[0].sourceId,"bing-rss");

function evidence(sourceId:string,url:string,snippet:string):SearchEvidence {
 return {id:sourceId+url,sourceId,url,title:"Institution directory",snippet,query:"licensed preschool",capturedAt:"2026-10-08T00:00:00.000Z",purpose:"discover"};
}
const single=buildLeadEvidenceGraph({kind:"referral",domain:"example.org",emails:[],phones:[],evidence:[
 evidence("mo-dhss-child-care-gis","https://gis.mo.gov/arcgis/0","Official facility licensed child care"),
]});
assert.equal(single.posture,"single_source");
assert.equal(single.governmentSources,1);
assert.equal(single.firstPartySources,0);
const corroborated=buildLeadEvidenceGraph({kind:"referral",domain:"example.org",emails:[],phones:[],evidence:[
 evidence("mo-dhss-child-care-gis","https://gis.mo.gov/arcgis/0","Official facility licensed child care"),
 evidence("public-website","https://example.org/school","Official facility licensed child care"),
]});
assert.equal(corroborated.publishers,2);
assert.equal(corroborated.posture,"corroborated");
assert.equal(corroborated.firstPartySources,1);
assert(corroborated.claims.some(x=>x.claim==="institution_exists"&&x.supported));
const conflicts=buildLeadEvidenceGraph({kind:"organization",domain:"example.org",emails:[],phones:[],evidence:[
 evidence("public-website","https://example.org/intake","Now accepting new clients"),
 evidence("public-web","https://localnews.com/report","Not accepting new clients"),
]});
assert.equal(conflicts.contradictions.length,1,"Contradictory intake reports must be visible");
assert.equal(conflicts.posture,"conflicting");
// Screenshot regression: an observed-only 80/100 score with 3% coverage is not an opportunity claim.
const noEvidence = assessOpportunityReliability({
  score:80, coverage:3, observedIndicators:3, pillarBreakdown:[
    {pillarId:"aba-supply",title:"Supply",score:80,observed:1,applicable:10,weight:8},
  ],
},1);
assert.equal(noEvidence.grade,"insufficient");
assert.equal(noEvidence.displayScore,null);
assert.equal(assessOpportunityReliability({
  score:49, coverage:5, observedIndicators:8, pillarBreakdown:[
    {pillarId:"referral-ecosystem",title:"Referrals",score:49,observed:8,applicable:10,weight:15},
  ],
},2).displayScore,null);
assert.equal(assessOpportunityReliability({
  score:71, coverage:15, observedIndicators:17, pillarBreakdown:[
    {pillarId:"referral-ecosystem",title:"Referrals",score:80,observed:8,applicable:10,weight:15},
    {pillarId:"developmental-demand",title:"Demand",score:60,observed:5,applicable:10,weight:14},
    {pillarId:"market-motion",title:"Competition",score:65,observed:4,applicable:10,weight:7},
  ],
},3).grade,"preliminary");

// NPPES 200-error response must never masquerade as a legitimate empty result.
assert.match(parseNppesResponse({Errors:[{description:"No taxonomy codes found with entered description"}]}).errors[0],/taxonomy/i);
assert.match(parseNppesResponse({}).errors[0],/result_count/);
assert.equal(parseNppesResponse({result_count:0,results:[]}).errors.length,0);

// Government-published dated roster is only a lead-reference fallback, never live provider supply.
assert.equal(KANSAS_PUBLISHED_PROGRAMS.length,29);
assert(KANSAS_PUBLISHED_PROGRAMS.every((p)=>p.archivedSnapshot));
assert.equal(buildKansasEarlyInterventionObservations(KANSAS_PUBLISHED_PROGRAMS,100000).length,0);
const archival=buildStateSourceContribution({
  state:"KS",engine:"client",location:"Kansas",under18Population:100000,
  kansasEarlyIntervention:KANSAS_PUBLISHED_PROGRAMS,
});
assert.equal(archival.snapshotOnly,true);
assert.equal(archival.observations.length,0);
assert.equal(archival.referralHits.length,29);
assert(archival.referralHits.every((hit)=>hit.snippet.includes("Historical official")));

console.log("Evidence mesh verification passed: registered publishers, live source planning, geography, Census decoding, RSS and claim corroboration.");
