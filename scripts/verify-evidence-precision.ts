import assert from "node:assert/strict";
import {publicPublisherId,samePublicNarrative,matchesPublishedArea} from "../lib/intelligence/signals/publisher-evidence";
import {scanPublicSignals} from "../lib/intelligence/signals/public-signal-scan";
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
console.log("Publisher precision passed: parent-domain dedupe, locality/state, syndication and age 2-18 corroboration.");
