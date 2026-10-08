import assert from "node:assert/strict";
import {publicPublisherId,samePublicNarrative,matchesPublishedArea} from "../lib/intelligence/signals/publisher-evidence";
import {scanPublicSignals} from "../lib/intelligence/signals/public-signal-scan";
import {buildLeadEvidenceGraph} from "../lib/intelligence/signals/lead-evidence-graph";
import {summarizeCompanyReviewEvidence} from "../lib/intelligence/signals/competitor-reviews";
import type {SearchEvidence} from "../lib/intelligence/source-types";
import type {PublicSearchHit} from "../lib/intelligence/source-types";
const hit=(host:string,text:string):PublicSearchHit=>({
  url:"https://"+host+"/institutional-report",title:text,snippet:"",query:"school-age services",
  sourceId:"bing-rss",rank:1,
});
assert.equal(publicPublisherId("news.example.com"),"example.com");
assert.equal(publicPublisherId("news.east.example.co.uk"),"example.co.uk");
assert.equal(publicPublisherId("state.colorado.gov"),"colorado.gov");
assert.equal(publicPublisherId(""),"");
assert(samePublicNarrative(
  "School board news about public waiting list for elementary school age children in Denver Colorado at the district autism clinic",
  "School board news about public waiting list for elementary school age children in Denver Colorado at the district autism clinic!"
));
assert(!samePublicNarrative("School board adds capacity","Clinic ends services"));
assert(matchesPublishedArea("Denver Colorado elementary school ABA waitlist","Denver, CO"));
assert(matchesPublishedArea("Kansas City MO public pediatric clinic","Kansas City, MO"));
assert(!matchesPublishedArea("Kansas City KS public pediatric clinic","Kansas City, MO"));
assert(!matchesPublishedArea("Boulder Colorado public clinic","Denver, CO"));
assert(matchesPublishedArea("Hutchinson Kansas public school","Hutchinson, KS"));
assert(!matchesPublishedArea("Hutchinson Missouri public school","Hutchinson, KS"));
assert(matchesPublishedArea("Preschool Kansas resource directory","Kansas"));
assert(!matchesPublishedArea("Preschool Colorado resource directory","Kansas"));
const samePublisher=scanPublicSignals([
  hit("agency.state.gov","Denver CO ABA waitlist for elementary school children due to staff vacancies"),
  hit("resources.agency.state.gov","Denver CO ABA waitlist for preschool children due to demand"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(samePublisher.observations.length,0,
  "Two separate pages of the same publisher cannot independently corroborate");
const copied=scanPublicSignals([
  hit("university.edu","Denver CO ABA waitlist for preschool ages 2-5 after public program expansion"),
  hit("citynews.com","Denver CO ABA waitlist for preschool ages 2-5 after public program expansion"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(copied.observations.length,0,"Syndicated copy is not independent evidence");
const regionMismatch=scanPublicSignals([
  hit("citynews.com","Denver Colorado ABA waitlist preschool ages 2-5"),
  hit("localjournal.org","Denver Kansas ABA waitlist preschool ages 2-5"),
],"2026-10-08","Denver, CO","2-18");
assert.equal(regionMismatch.observations.length,0,"Wrong-state articles cannot corroborate Denver CO");
const valid=scanPublicSignals([
  hit("localgovernment.gov","Denver CO ABA waitlist reported by local school board for preschool ages 2-5"),
  hit("regionalpress.org","Denver Colorado ABA waitlist described by an independent regional reporter covering preschool services"),
],"2026-10-08","Denver, CO","2-18");
assert(valid.observations.some((x)=>x.indicatorId==="service-capacity.01"),
  "Independent age-qualified reports from the same verified locality should qualify");
assert.equal(valid.crossChecks.length,60);
assert.notEqual(publicPublisherId("one.k12.mo.us"),publicPublisherId("two.k12.mo.us"),
  "Separate school districts must be distinct publishers");
const lateRelevant=scanPublicSignals([
  hit("local.example.org","ABA waitlist for school age children in Boulder Colorado"),
  hit("local.example.org","ABA waitlist for elementary school children in Denver Colorado"),
  hit("district.edu","ABA waitlist in Denver CO preschool service program"),
],"2026-10-08","Denver, CO","2-18");
assert(lateRelevant.observations.some((x)=>x.indicatorId==="service-capacity.01"),
  "A later eligible hit on the same publisher must not be discarded by an earlier off-area hit");

function ev(url:string,snippet:string,sourceId="public-web"):SearchEvidence {
  return {id:url,url,title:"Institution directory",snippet,sourceId,
    capturedAt:"2026-10-08T01:00:00Z",query:"public organization",purpose:"discover"};
}
const rumors=buildLeadEvidenceGraph({
  kind:"referral",domain:"clinic.example",emails:[],phones:[],
  evidence:[
    ev("https://unknown.net/first","Licensed child care facility present on directory"),
    ev("https://randomsource.org/second","Public reports separately say licensed child care facility exists"),
  ],
});
assert.equal(rumors.claims.find((x)=>x.claim==="institution_exists")?.supported,false,
  "Unrelated .org domains must not be treated as institutional authorities");

const realCorroboration=buildLeadEvidenceGraph({
  kind:"referral",domain:"clinic.example",emails:[],phones:[],
  evidence:[
    ev("https://licensing.gov/record","State license report describes licensed child care facility","mo-dhss-child-care-gis"),
    ev("https://clinic.example/license","Organization directory confirms licensed preschool facility in the service region","public-website"),
  ],
});
assert.equal(realCorroboration.posture,"corroborated");
assert(realCorroboration.claims.find((x)=>x.claim==="institution_exists")?.supported);

const reposted=buildLeadEvidenceGraph({
  kind:"referral",domain:"clinic.example",emails:[],phones:[],
  evidence:[
    ev("https://agency.gov/report","Official facility licensed child care is confirmed in this public report"),
    ev("https://press.org/copy","Official facility licensed child care is confirmed in this public report"),
  ],
});
assert.notEqual(reposted.posture,"corroborated","Syndicated primary-source story alone cannot confirm a claim");
const conflicting=buildLeadEvidenceGraph({
  kind:"organization",domain:"clinic.example",emails:[],phones:[],
  evidence:[
    ev("https://clinic.example/intake","Now accepting new patients at the service clinic"),
    ev("https://localnews.org/report","Not accepting new patients at the service clinic"),
  ],
});
assert.equal(conflicting.posture,"conflicting");
assert(!conflicting.claims.find((x)=>x.claim==="service_available")?.supported);
const review=summarizeCompanyReviewEvidence({id:"c",name:"Example ABA Therapy",domain:"clinic.example"},[],"Denver CO");
assert.equal(review.status,"no_public_evidence");
assert.equal(review.reviewLinks.length,2);
assert(review.reviewLinks.every((link)=>link.linkOnly));

console.log("Publisher precision passed: parent-domain dedupe, locality/state, syndication and age 2-18 corroboration.");
