import assert from "node:assert/strict";
import { buildProviderReviewDossier,providerReviewQuery,providerReviewQueries,reviewBelongsToOrganization,isRestrictedReviewSite,reputationMayIncreaseOpportunityScore } from "../lib/intelligence/signals/provider-reputation";
import type { PublicSearchHit } from "../lib/intelligence/source-types";
const company={id:"aba-test",name:"Bright Star Behavior Clinic",kind:"organization" as const};
const hit=(url:string,title:string,snippet="review narrative from a private family"):PublicSearchHit=>({
  title, url,snippet,query:"bright star company reviews",sourceId:"bing-rss",rank:1,
});
assert(isRestrictedReviewSite("https://www.yelp.com/biz/bright-star-behavior-clinic"));
assert(isRestrictedReviewSite("https://www.google.com/maps/place/Bright+Star+Behavior+Clinic"));
assert(isRestrictedReviewSite("https://maps.google.com/maps?q=company"));
assert(!isRestrictedReviewSite("https://www.localnewspaper.com/business/bright-star"));
assert.equal(providerReviewQueries(company,"Denver, CO").length,3);
assert(providerReviewQueries(company,"Denver, CO").some(q=>q.includes("site:yelp.com/biz")));
assert(providerReviewQueries(company,"Denver, CO").some(q=>q.includes("site:google.com/maps")));
assert.equal(providerReviewQuery({name:"Rando",kind:"candidate"},"Denver"),null);
const references=[
 hit("https://www.yelp.com/biz/bright-star","Bright Star Behavior Clinic reviews Yelp"),
 hit("https://www.google.com/maps/place/Bright+Star","Bright Star Behavior Clinic - Google Maps"),
 hit("https://www.localnews.com/story","Bright Star Behavior Clinic concerns reported"),
 hit("https://www.yelp.com/biz/bright-star?ref=search","Bright Star Behavior Clinic reviews Yelp","duplicate"),
 hit("https://www.yelp.com/biz/wrong","Other ABA Clinic Yelp reviews"),
 hit("https://other.net/private-review","Bright Star Behavior Clinic private family address"),
];
assert(reviewBelongsToOrganization(references[0],company.name));
assert(!reviewBelongsToOrganization(references[4],company.name));
const dossier=buildProviderReviewDossier(company,references);
assert.equal(dossier.organizationId,company.id);
console.log("Reputation link publishers:", dossier.reviews.map((x)=>x.publisher));
assert.equal(dossier.reviews.length,3,"No unrelated competitor, unknown site, or duplicate tracking links");
assert.equal(dossier.reviews.find(x=>x.publisher==="Yelp")?.access,"link_only");
assert.equal(dossier.reviews.find(x=>x.publisher==="Google Maps")?.access,"link_only");
assert.equal(dossier.reviews.find(x=>x.publisher==="Independent press")?.access,"third_party_context");
assert.equal(dossier.verifiedReviewCount,0,"Do not invent ratings or claims from search result links");
assert.equal(dossier.finding,"unverified");
assert(!JSON.stringify(dossier).includes("private family"),"Do not retain personal review snippets");
assert.equal(reputationMayIncreaseOpportunityScore(dossier),false,"Reviews are context, not a positive-market demand score");
const empty=buildProviderReviewDossier(company,[references[4]]);
assert.equal(empty.reviews.length,0,"Wrong company review must not appear in dossier");
console.log("Provider review discovery tested: link-only restricted platforms, no author extraction, organization matching, deduplication, no review-based scoring.");
