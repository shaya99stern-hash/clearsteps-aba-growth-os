import assert from "node:assert/strict";
import {PUBLIC_SIGNAL_RULES} from "../lib/intelligence/signals/extended-catalog";
import {AGES_2_TO_18_RULES} from "../lib/intelligence/signals/age-2-18-catalog";
import {planWeakSignalFollowups} from "../lib/intelligence/signals/adaptive-followup";
import {scanPublicSignals} from "../lib/intelligence/signals/public-signal-scan";
import type {PublicSignalClue} from "../lib/intelligence/signals/public-signal-scan";
import type {PublicSearchHit} from "../lib/intelligence/source-types";

const rules=[...PUBLIC_SIGNAL_RULES,...AGES_2_TO_18_RULES];
assert(rules.length>=180,"At least 180 real signal rules must be addressable for investigation");
const clues:PublicSignalClue[]=rules.map((rule)=>({
  indicatorId:rule.id,name:rule.name,group:rule.group,corroborated:false,
  sourceCount:1,evidenceTypes:["organization"],sourceDomains:["original.example.org"],
  geographySupported:false,ageSupported:false,
}));
assert.equal(clues.length,180);
const probes=planWeakSignalFollowups(clues,"Denver County, CO","2-18",6,0);
assert.equal(probes.length,6);
assert.equal(new Set(probes.map((p)=>p.clueId)).size,6);
assert(probes.every((p)=>p.query.includes("Denver County, CO")));
assert(probes.every((p)=>p.query.includes("-site:original.example.org")));
assert(probes.every((p)=>p.researchOnly===true));
assert(new Set(probes.map((p)=>rules.find((rule)=>rule.id===p.clueId)?.group)).size>=3,
  "Search budget must investigate multiple public signal families, not 6 copies of one");
const rotated=planWeakSignalFollowups(clues,"Denver County, CO","2-18",6,7);
assert.notDeepEqual(probes.map((p)=>p.clueId),rotated.map((p)=>p.clueId));
assert.equal(planWeakSignalFollowups(clues,"Denver County, CO","2-18",100).length,6,
  "Limit per HTTP request prevents server timeouts; rotate through all candidate hypotheses over runs");
assert.equal(planWeakSignalFollowups(clues.map((c)=>({...c,corroborated:true})),"Denver County, CO","2-18").length,0);
assert.equal(planWeakSignalFollowups([],"Denver County, CO","2-18").length,0);
const hit=(title:string,snippet:string,domain:string):PublicSearchHit=>({
  title,snippet,url:"https://"+domain+"/news",query:"public institutional service research",
  sourceId:"bing-rss",rank:1,
});
const single=scanPublicSignals([
  hit("Denver CO ABA preschool ages 2-5 waitlist",
      "Denver Colorado school-age ABA public enrollment waiting list", "first.gov"),
],"2026-10-08","Denver, CO","2-18");
assert(single.clues.some((c)=>c.indicatorId==="service-capacity.01"&&!c.corroborated),
  "One public agency clue remains eligible for further independent verification");
const next=planWeakSignalFollowups(single.clues,"Denver, CO","2-18");
assert(next.some((probe)=>probe.clueId==="service-capacity.01"));
const after=scanPublicSignals([
  hit("Denver CO ABA preschool ages 2-5 waitlist",
      "Denver Colorado school-age ABA public enrollment waiting list","first.gov"),
  hit("Denver Colorado ABA clinic waitlist children ages 2-5 update",
      "Independent Denver CO preschool therapy availability notice in a local report", "secondnews.org"),
],"2026-10-08","Denver, CO","2-18");
assert(after.observations.some((item)=>item.indicatorId==="service-capacity.01"),
  "Two non-syndicated local independently published clues can corroborate a service capacity hypothesis");
assert(after.observations.every((x)=>!x.sourceIds.includes("reddit.com")),
  "No household/client identifiers in institutional cross-reference results");
console.log("Weak-clue investigator passed: 180 addressable hypotheses, diverse rotated bounded follow-ups, strict independent geographic and age checks.");
