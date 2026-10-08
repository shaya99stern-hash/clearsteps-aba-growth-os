import assert from "node:assert/strict";
import { isRestrictedReviewPlatformUrl, candidateAbaCompetitors, summarizeCompanyReviewEvidence } from "../lib/intelligence/signals/competitor-reviews";
import type { ResolvedLead } from "../lib/intelligence/source-types";
import { parseSingleAgeCountyCsv, censusSingleAgeCsvUrl } from "../lib/intelligence/official/census-county-single-age";
import { PUBLIC_SOURCE_CHANNELS, choosePublicSourceChannels } from "../lib/intelligence/signals/source-channel-catalog";
import { PUBLIC_SIGNAL_RULES, CROSS_SOURCE_CHECKS } from "../lib/intelligence/signals/extended-catalog";
import { AGES_2_TO_18_PILLARS, AGES_2_TO_18_RULES, AGES_2_TO_18_CHECKS } from "../lib/intelligence/signals/age-2-18-catalog";
import { INDICATOR_CATALOG, INDICATOR_PILLARS } from "../lib/intelligence/phase3/indicator-catalog";
import { assessPublicAgeFit, isAgeAlignedPublicProgram, safeMeasuredPopulation3To17 } from "../lib/intelligence/signals/target-ages";
import { scanPublicSignals } from "../lib/intelligence/signals/public-signal-scan";
import type { PublicSearchHit } from "../lib/intelligence/source-types";

assert(PUBLIC_SOURCE_CHANNELS.length >= 228, "Must triple the original 76 candidate public publisher channels");
assert.equal(new Set(PUBLIC_SOURCE_CHANNELS.map((item) => item.host)).size,PUBLIC_SOURCE_CHANNELS.length,
  "Publisher hostnames must remain uniquely addressable");
assert.equal(AGES_2_TO_18_PILLARS.length,12);
assert.equal(AGES_2_TO_18_RULES.length,120);
assert.equal(PUBLIC_SIGNAL_RULES.length+AGES_2_TO_18_RULES.length,180);
assert.equal(CROSS_SOURCE_CHECKS.length+AGES_2_TO_18_CHECKS.length,60);
assert.equal(new Set([...CROSS_SOURCE_CHECKS,...AGES_2_TO_18_CHECKS].map((c)=>c.id)).size,60);
assert.equal(INDICATOR_PILLARS.length,30);
assert.equal(INDICATOR_CATALOG.length,300);
assert.equal(new Set(INDICATOR_CATALOG.map((c)=>c.id)).size,300);

const getHits=(text:string,domain:string):PublicSearchHit=>({
  title:text,url:"https://"+domain+"/school-program",snippet:"Denver CO school age " + text,query:"ABA Denver Colorado",
  sourceId:"bing-rss",rank:1,
});
assert.equal(assessPublicAgeFit("program ages 2-18"),"explicit_target");
assert.equal(assessPublicAgeFit("program ages 13-18"),"target_subset");
assert.equal(assessPublicAgeFit("program ages 0-21"),"mixed_ages");
assert.equal(assessPublicAgeFit("preschool program"),"target_subset");
assert.equal(assessPublicAgeFit("ages 19-25 only"),"outside");
assert.equal(assessPublicAgeFit("children ages 0-2 only"),"mixed_ages"); // Age 2 overlaps but ages 0–1 must be excluded.
assert(!isAgeAlignedPublicProgram("autism awareness road sign outside a particular home"));
const age3to17=safeMeasuredPopulation3To17({age3to5:1500,age6to11:3500,age12to17:2500});
assert.equal(age3to17.ages3to17,7500);
assert.equal(age3to17.exactAge2to18,null,"Cannot invent age 2 and 18 from grouped ACS tables");

const complete=scanPublicSignals([
  getHits("ABA waitlist for preschool ages 2-5", "district.edu"),
  getHits("ABA waitlist in elementary school program", "localpaper.com"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(complete.ageRange?.join("-"),"2-18");
assert(complete.observations.some((x)=>x.indicatorId==="service-capacity.01"),
  "Two independent age-aligned publishers can corroborate an institutional service clue");

const excluded=scanPublicSignals([
  getHits("ABA waitlist for children ages 0-1", "district.edu"),
  getHits("ABA waitlist for adults ages 19-25", "localpaper.com"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(excluded.observations.length,0,"Off-age evidence never increases client market score");

const mixed=scanPublicSignals([
  getHits("ABA waitlist ages 0-21", "district.edu"),
  getHits("ABA waitlist ages 0-21", "localpaper.com"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(mixed.observations.length,0,"Public programs spanning out-of-scope ages require clarification");

const repeated=scanPublicSignals([
  getHits("ABA waitlist elementary school Denver", "first.org"),
  getHits("ABA waitlist elementary school Denver", "second.org"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(repeated.observations.length,0,"Exact syndicated narrative may not self-corroborate");

const uncorroborated=scanPublicSignals([
  getHits("Teen autism community program expansion", "localpaper.com"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(uncorroborated.observations.length,0,"One public source is research only");
assert.equal(uncorroborated.crossChecks.length,60);

for(const state of ["MO","KS","CO"] as const) {
  const client=choosePublicSourceChannels(state,"client","school-age resource",8);
  assert(client.some((c)=>c.scope===state),"Must look at local official and community publishers");
  assert(client.every((c)=>["federal","national",state].includes(c.scope)),"No unrelated state sources");
}
// Exact 2025 Census county ages must be computed from single-year published age cells.
const censusHeader="SUMLEV,STATE,COUNTY,STNAME,CTYNAME,YEAR,AGE,TOT_POP,TOT_MALE,TOT_FEMALE";
const censusRows=[...Array.from({length:86},(_,age)=>`050,08,031,Colorado,Denver County,7,${age},${100+age},0,0`)];
const csv=[censusHeader,...censusRows].join("\n");
const county=parseSingleAgeCountyCsv(csv,"CO","Denver County, CO");
assert.equal(county.ages2to18,Array.from({length:17},(_,i)=>102+i).reduce((a,b)=>a+b,0));
assert.equal(county.ages2to5,102+103+104+105);
assert.equal(county.geographyKind,"county");
assert.equal(county.counties,1);
assert.equal(county.year,2025);
assert.match(censusSingleAgeCsvUrl("CO"),/syasex-08\.csv$/);
assert.throws(()=>parseSingleAgeCountyCsv(csv,"CO","Denver, CO"),/explicit County/);
assert.throws(()=>parseSingleAgeCountyCsv([censusHeader,...censusRows.slice(0,70)].join("\n"),"CO","Denver County, CO"),/Missing Census age/);

// Competitor review layer: research ONLY organizations. Google/Yelp are link-only.
const competitor:ResolvedLead={
  id:"clinic-1",name:"Clearview ABA Therapy",kind:"competitor_signal",domain:"clearviewaba.example",
  website:"https://clearviewaba.example",score:40,confidence:35,location:"Denver",
  reasons:[],unknowns:[],emails:[],phones:[],signals:[],evidence:[],
};
const preschool:ResolvedLead={...competitor,id:"school",name:"Example Inclusive Preschool",kind:"referral"};
assert.equal(candidateAbaCompetitors([preschool,competitor]).length,1);
assert(isRestrictedReviewPlatformUrl("https://www.yelp.com/biz/clearview"));
assert(isRestrictedReviewPlatformUrl("https://maps.google.com/?cid=123"));
const companyHit=(url:string,title:string,snippet:string):PublicSearchHit=>({
  title,snippet,url,query:"ABA clinic Denver public reputation",sourceId:"bing-rss",rank:1,
});
const reputation=summarizeCompanyReviewEvidence(competitor,[
  companyHit("https://www.yelp.com/biz/clearview","Clearview ABA Therapy - Reviews","Reviewer testimony not retained"),
  companyHit("https://independentnews.com/story1","Clearview ABA Therapy staffing shortage","Clearview ABA Therapy clinic staffing shortage discussed in a city news report"),
  companyHit("https://cityjournal.org/story2","Clearview ABA Therapy local investigation","Clearview ABA Therapy clinic staff turnover reported separately"),
  companyHit("https://cityjournal.org/story3","Unrelated ABA Therapy","A different company's waitlist"),
  companyHit("https://myblog.net/story4","Clearview ABA Therapy parent review","My child was diagnosed and waited for therapy"),
],"Denver CO");
assert.equal(reputation.status,"corroborated");
assert(reputation.publicThemes.some((x)=>x.theme==="staffing" && x.independentlyCorroborated && x.publishers===2));
assert(!JSON.stringify(reputation).includes("My child"),"Reviewer health and family narratives must not be retained");
assert(reputation.reviewLinks.some((x)=>x.platform==="Yelp" && x.linkOnly));
assert(reputation.reviewLinks.some((x)=>x.platform==="Google Maps" && x.linkOnly));
const syndicated=summarizeCompanyReviewEvidence(competitor,[
  companyHit("https://independentnews.com/one","Clearview ABA Therapy clinic staffing shortage","A public clinic staffing shortage was identified in Denver"),
  companyHit("https://regionalnews.net/two","Clearview ABA Therapy clinic staffing shortage","A public clinic staffing shortage was identified in Denver"),
],"Denver CO");
assert.equal(syndicated.status,"unconfirmed","Cross-posted identical content is not independently corroborated");

console.log("2–18 institutional intelligence: 274 candidate channels, 300 indicator definitions, 180 text rules, 60 checks, age/syndication/privacy safeguards.");
