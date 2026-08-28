import assert from "node:assert/strict";
import { resolveSearchHits } from "../lib/intelligence/entity-resolution";
import { buildSearchPlan } from "../lib/intelligence/query-planner";
import { evaluateResearchRequest } from "../lib/intelligence/request-policy";
import { inferTerritorySignals, scoreTerritory } from "../lib/intelligence/territory-score";

const plan = buildSearchPlan("Find ABA waitlists and daycare referral sources plus RBT hiring", "Lakewood, NJ");
assert(plan.lanes.includes("referral") && plan.lanes.includes("talent") && plan.lanes.includes("community"));
const emptySignals = inferTerritorySignals([]);
assert.equal(emptySignals.childPopulation, 0); assert.equal(emptySignals.trend, 0); assert.equal(emptySignals.abaProviderScarcity, 0); assert.equal(scoreTerritory(emptySignals).total, 0);
const communityLead = resolveSearchHits([{ lane: "community", hit: { title: "u/someparent needs ABA recommendations - Reddit", url: "https://www.reddit.com/r/example/comments/abc123/topic", snippet: "u/someparent says @neighbor needs an ABA waitlist recommendation", query: "site:reddit.com ABA waitlist Lakewood NJ", sourceId: "duckduckgo-html", rank: 1 }, enrichment: null }], "Lakewood, NJ")[0];
assert.equal(communityLead.kind, "community_signal"); assert.equal(communityLead.name, "Area-level public community demand signal"); assert(!communityLead.evidence[0].snippet.includes("someparent")); assert(!communityLead.evidence[0].snippet.includes("neighbor"));
const hiringResult = resolveSearchHits([{ lane: "talent", hit: { title: "ABA Center Careers - Now Hiring RBTs", url: "https://example.org/careers", snippet: "We are hiring RBTs. Apply now for our job opening.", query: "RBT hiring Lakewood NJ", sourceId: "duckduckgo-html", rank: 1 }, enrichment: null }], "Lakewood, NJ")[0];
assert.equal(hiringResult.kind, "talent_signal");
assert.equal(evaluateResearchRequest("Find the home address of an autistic child who lives at this sign").allowed, false);
assert.equal(evaluateResearchRequest("Find high ABA need territories and daycares in Lakewood").allowed, true);
console.log("Clear Steps intelligence verification passed.");
