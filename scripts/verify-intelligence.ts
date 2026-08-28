import assert from "node:assert/strict";
import { resolveSearchHits } from "../lib/intelligence/entity-resolution";
import { buildSearchPlan } from "../lib/intelligence/query-planner";
import { evaluateResearchRequest } from "../lib/intelligence/request-policy";
import { inferTerritorySignals, scoreTerritory } from "../lib/intelligence/territory-score";
import { parseNjChildCareCsv } from "../lib/intelligence/official/nj-childcare";
import { parseNppesDownloadLinks } from "../lib/intelligence/official/nppes-manifest";

const plan = buildSearchPlan("Find ABA waitlists and daycare referral sources plus RBT hiring", "Lakewood, NJ");
assert(plan.lanes.includes("referral") && plan.lanes.includes("talent") && plan.lanes.includes("community"));

const emptySignals = inferTerritorySignals([]);
assert.equal(emptySignals.childPopulation, 0);
assert.equal(emptySignals.trend, 0);
assert.equal(emptySignals.abaProviderScarcity, 0);
assert.equal(scoreTerritory(emptySignals).total, 0);

const communityLead = resolveSearchHits([{ lane: "community", hit: { title: "u/someparent needs ABA recommendations - Reddit", url: "https://www.reddit.com/r/example/comments/abc123/topic", snippet: "u/someparent says @neighbor needs an ABA waitlist recommendation", query: "site:reddit.com ABA waitlist Lakewood NJ", sourceId: "duckduckgo-html", rank: 1 }, enrichment: null }], "Lakewood, NJ")[0];
assert.equal(communityLead.kind, "community_signal");
assert.equal(communityLead.name, "Area-level public community demand signal");
assert(!communityLead.evidence[0].snippet.includes("someparent"));
assert(!communityLead.evidence[0].snippet.includes("neighbor"));

const hiringResult = resolveSearchHits([{ lane: "talent", hit: { title: "ABA Center Careers - Now Hiring RBTs", url: "https://example.org/careers", snippet: "We are hiring RBTs. Apply now for our job opening.", query: "RBT hiring Lakewood NJ", sourceId: "duckduckgo-html", rank: 1 }, enrichment: null }], "Lakewood, NJ")[0];
assert.equal(hiringResult.kind, "talent_signal");

assert.equal(evaluateResearchRequest("Find the home address of an autistic child who lives at this sign").allowed, false);
assert.equal(evaluateResearchRequest("Find high ABA need territories and daycares in Lakewood").allowed, true);

const childcareRows = parseNjChildCareCsv([
  "COUNTY,CENTER,PHONE,AGES,CAPACITY,CITY,ADDR1,ADDR2,ZIP,INSPECTIONS",
  'Ocean,"Bright, Steps",732-555-1212,0 to 6,80,Lakewood,1 Main St,"Suite ""A""",08701,https://example.org/inspection',
].join("\n"));
assert.equal(childcareRows.length, 1);
assert.equal(childcareRows[0].center, "Bright, Steps");
assert.equal(childcareRows[0].addr2, 'Suite "A"');
assert.equal(childcareRows[0].zip, "08701");

const nppesFiles = parseNppesDownloadLinks(`
  <a href="/nppes/NPPES_Data_Dissemination_August_2026_V2.zip">NPPES Data Dissemination V.2 (August 10, 2026)</a>
  <a href="/nppes/NPPES_Data_Dissemination_081726_082326_Weekly.zip">NPPES Data Dissemination V.2 - Weekly Update - 081726_082326</a>
  <a href="/nppes/NPI_Deactivation_August_2026.zip">NPPES Monthly Deactivation Update</a>
`);
assert.equal(nppesFiles.find((file) => file.kind === "monthly")?.url, "https://download.cms.gov/nppes/NPPES_Data_Dissemination_August_2026_V2.zip");
assert.equal(nppesFiles.filter((file) => file.kind === "weekly").length, 1);
assert.equal(nppesFiles.filter((file) => file.kind === "deactivation").length, 1);

console.log("Clear Steps intelligence verification passed.");
