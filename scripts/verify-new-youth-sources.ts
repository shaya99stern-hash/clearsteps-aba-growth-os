import assert from "node:assert/strict";
import { ADDITIONAL_YOUTH_SOURCE_CHANNELS } from "../lib/intelligence/signals/additional-youth-source-channels";
import { PUBLIC_SOURCE_CHANNELS, choosePublicSourceChannels, matchedPublicSourceChannels, queryForPublicSource, isAggregateOnlyPublicSourceUrl } from "../lib/intelligence/signals/source-channel-catalog";
import { SERVICE_DOCUMENT_PARSERS, SERVICE_DOCUMENT_CHECKS, runServiceDocumentChecks } from "../lib/intelligence/signals/service-document-checks";
import { scanPublicSignals } from "../lib/intelligence/signals/public-signal-scan";

assert.equal(ADDITIONAL_YOUTH_SOURCE_CHANNELS.length,20,"twenty NEW candidate public sources");
assert.equal(PUBLIC_SOURCE_CHANNELS.length,294,"no accidental source drop / duplicate");
assert.equal(new Set(PUBLIC_SOURCE_CHANNELS.map((item)=>item.host)).size,294,"every candidate host is unique");
assert.equal(SERVICE_DOCUMENT_PARSERS.length,30,"30 distinct evidence parsers");
assert.equal(SERVICE_DOCUMENT_CHECKS.length,30,"30 new cross-reference tests");
assert.equal(new Set(SERVICE_DOCUMENT_PARSERS.map((item)=>item.id)).size,30);
assert.equal(new Set(SERVICE_DOCUMENT_CHECKS.map((item)=>item.id)).size,30);
for(const check of SERVICE_DOCUMENT_CHECKS) {
  assert(SERVICE_DOCUMENT_PARSERS.some((p)=>p.id===check.left));
  assert(SERVICE_DOCUMENT_PARSERS.some((p)=>p.id===check.right));
  assert.notEqual(check.left,check.right,"cross references must combine different evidence");
}
for(const state of ["MO","KS","CO"] as const){
  const queries=Array.from({length:25},(_,rotation)=>choosePublicSourceChannels(state,"client","City, "+state,6,rotation));
  assert(queries.some((c)=>c.some((channel)=>ADDITIONAL_YOUTH_SOURCE_CHANNELS.some((x)=>x.host===channel.host))));
  assert(queries.every((selected)=>selected.every((item)=>["federal","national",state].includes(item.scope))));
  assert(queries.every((selected)=>selected.every((item)=>queryForPublicSource(item,"Sample County, "+state,"client").includes("Sample County"))));
}
assert.equal(ADDITIONAL_YOUTH_SOURCE_CHANNELS.filter((x)=>x.access==="aggregate-only").length,2);
assert.deepEqual(matchedPublicSourceChannels(["https://koec.ks.gov/about","https://www.1800childrenks.org/","https://unknown.invalid"]),["1800childrenks.org","koec.ks.gov"]);
assert(isAggregateOnlyPublicSourceUrl("https://ks.childcareaware.org/data-research/"));
assert(isAggregateOnlyPublicSourceUrl("https://web.mhanet.com/health-equity-dashboards/"));
assert(!isAggregateOnlyPublicSourceUrl("https://ecclacolorado.org/councilmap"));
const official={host:"publicagency.gov",text:"Denver CO ages 2-18 ABA therapy waitlist pediatric service shortage"};
const hospital={host:"localclinic.org",text:"Denver Colorado ages 2-18 ABA therapy waitlist pediatric service shortage"};
const newspaper={host:"localdaily.com",text:"Denver CO ages 2-18 ABA therapy waitlist pediatric service shortage"};
const verified=runServiceDocumentChecks([official,hospital,newspaper],"Denver, CO","2-18");
assert.equal(verified.findings.length,30);
assert.equal(verified.findings.find((x)=>x.id==="D01")?.status,"supported");
assert(verified.parsedCategories.includes("intake-waitlist") && verified.parsedCategories.includes("pediatric-shortage"));
const solo=runServiceDocumentChecks([official],"Denver, CO","2-18");
assert.notEqual(solo.findings.find((x)=>x.id==="D01")?.status,"supported","one agency is not independent corroboration");
const wrongGeography=runServiceDocumentChecks([official,hospital,newspaper],"Denver, KS","2-18");
assert.equal(wrongGeography.supported,0,"identical named city in wrong state");
const wrongAge=runServiceDocumentChecks([official,hospital,newspaper].map(item=>({ ...item, text: item.text.replace("ages 2-18","ages 2-5") })),"Denver, CO","6-11");
assert.equal(wrongAge.supported,0,"preschool-only evidence cannot support the 6–11 age cohort");
const raw=scanPublicSignals([
 {title:official.text,snippet:official.text,url:"https://publicagency.gov/report",sourceId:"duckduckgo-html",query:"Denver CO",rank:1},
 {title:hospital.text,snippet:hospital.text,url:"https://localclinic.org/reports",sourceId:"bing-rss",query:"Denver CO",rank:1},
 {title:newspaper.text,snippet:newspaper.text,url:"https://localdaily.com/story",sourceId:"bing-rss",query:"Denver CO",rank:1},
],"2026-10-09T00:00:00Z","Denver, CO","2-18");
assert.equal(raw.crossChecks.length,90,"30 new checks must actually execute inside Scout");
assert.equal(raw.crossChecks.find((x)=>x.id==="D01")?.status,"supported");
assert(raw.parsedDocumentCategories>=2);
assert.equal(runServiceDocumentChecks([{...official,text:"Denver CO ages 2-18 no ABA therapy waitlist pediatric service shortage"}],"Denver, CO","2-18").supported,0,"negated availability must not prove a waitlist");
assert.equal(runServiceDocumentChecks([{...official,text:"My child with autism at our home in Denver CO ages 2-18 has ABA therapy waitlist"}],"Denver, CO","2-18").parsedCategories.length,0,"private household content excluded");
console.log("30 public document parsers + 30 cross-checks and 20 youth sources validated; 294 configured source channels, 90 runnable cross-checks.");
