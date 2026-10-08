import assert from "node:assert/strict";
import {matchesPublicOrganization,isPublicInstitutionalLead,selectOrganizationWebsiteHit,
 publicInstitutionLookupQuery,enrichInstitutionalLead} from "../lib/intelligence/institutional-enrichment";
import {buildSearchPlan} from "../lib/intelligence/query-planner";
import type {PublicSearchHit,ResolvedLead,EnrichedWebsite} from "../lib/intelligence/source-types";

const lead:ResolvedLead={
 id:"co-facility-test",name:"ADAMS COUNTY SCH DIST 12",kind:"referral",
 domain:"data.colorado.gov",website:"https://data.colorado.gov/dataset",
 location:"Denver County, Colorado",score:33,confidence:39,
 reasons:["1 official evidence record"],unknowns:["Only one independent publisher"],
 phones:[],emails:[],signals:["school district"],
 evidence:[{id:"e1",sourceId:"co-cdec-licensed-childcare",title:"ADAMS COUNTY SCH DIST 12",
   url:"https://data.colorado.gov/dataset",snippet:"Licensed school-age facility in Denver County, Colorado",
   query:"CDEC institutional listing",capturedAt:"2026-10-08T00:00:00.000Z",purpose:"discover"}],
};
assert(isPublicInstitutionalLead(lead));
assert(!isPublicInstitutionalLead({...lead,kind:"community_signal"}));
assert(!isPublicInstitutionalLead({...lead,evidence:[]}));
assert(matchesPublicOrganization("ADAMS COUNTY SCH DIST 12","Adams County School District 12 Colorado official website"));
assert(matchesPublicOrganization("ADAMS COUNTY SCH DIST 12","Adams 12 Five Star Schools"));
assert(!matchesPublicOrganization("ADAMS COUNTY SCH DIST 12","Adams County School District 14"));
assert(!matchesPublicOrganization("ADAMS COUNTY SCH DIST 12","Boulder Valley School District"));
assert(!matchesPublicOrganization("Bright Steps ABA","Blue Bell ABA"));
assert.match(publicInstitutionLookupQuery(lead.name,"Denver County, CO"),/official website contact/);
const hit=(url:string,title:string,snippet=""):PublicSearchHit=>({
 url,title,snippet,query:"public organization lookup",sourceId:"bing-rss",rank:1,
});
const searchHits=[
 hit("https://www.yelp.com/biz/adams-12","Adams County School District 12 reviews"),
 hit("https://www.facebook.com/adams12","Adams County School District 12 posts"),
 hit("https://www.adams12.org/contact","Adams 12 Five Star Schools | Contact","Adams County School District 12"),
 hit("https://example-school.com/contact","Adams County School District 14 contact"),
];
const good=selectOrganizationWebsiteHit(lead,searchHits);
assert.equal(good?.url,"https://www.adams12.org/contact");
const liveSite:EnrichedWebsite={
 url:good!.url,finalUrl:good!.url,title:"Adams 12 Five Star Schools",
 emails:["contact@adams12.org"],phones:["303-555-0100"],
 textSample:"Adams County School District 12, Colorado public district contact information",
 fetchedAt:"2026-10-08T00:00:00.000Z",
};
const verified=enrichInstitutionalLead(lead,good!,liveSite);
assert.equal(verified.domain,"adams12.org");
assert.equal(verified.website,"https://www.adams12.org/contact");
assert.deepEqual(verified.emails,["contact@adams12.org"]);
assert.equal(verified.evidence.length,2,"Add a public URL without fabricating an extra official record");
assert(verified.confidence>lead.confidence);
assert.equal(lead.emails.length,0,"Original clinic listing must remain immutable");
const unrelatedSite={...liveSite,title:"Other provider",textSample:"Other County District 14"};
const denied=enrichInstitutionalLead(lead,good!,unrelatedSite);
assert.equal(denied.phones.length,0,"Search hit must not inherit contact from unrelated page");
assert.equal(denied.domain,"data.colorado.gov");
assert.equal(denied.confidence,lead.confidence);
assert.equal(selectOrganizationWebsiteHit(lead,searchHits.slice(0,2)),null,
 "Never crawl Yelp or Facebook looking for review-author or parent contacts");
const plan=buildSearchPlan("Find children services","Denver, CO","client","CO");
const top=plan.queries.slice(0,12);
assert(top.some((item)=>item.lane==="market"),"Provider market needs live search quota");
assert(top.some((item)=>item.lane==="referral"),"Institutions need live search quota");
assert(top.filter((item)=>item.query.startsWith("site:")).length<=4,
 "Do not let 274 candidate domains crowd out actual local institution searches");
console.log("Institution follow-up passed: public identity, verified site contacts, strict exclusions and search priority.");
