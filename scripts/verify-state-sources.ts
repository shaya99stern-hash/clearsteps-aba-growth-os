import assert from "node:assert/strict";
import {
  parseMissouriChildCareFeatures,
  buildMissouriChildCareObservations,
  missouriChildCareToSearchHits,
} from "../lib/intelligence/official/mo-child-care-gis";
import { stateSourceSelection } from "../lib/intelligence/official/state-source-selection";
import {
  buildStateSourceContribution,
  collectStateSourceContribution,
  mergeStateSourceLeads,
} from "../lib/intelligence/official/state-source-contribution";
import { resolveSearchHits } from "../lib/intelligence/entity-resolution";

const payload = {
  features: [
    {
      attributes: {
        OBJECTID: 1,
        SITE_TYPE: "LICENSED",
        STATUS: "OPEN",
        FACILITY: "Purple Steps Preschool",
        DVN: "001234567",
        ADDRESS: "100 Main St",
        CITY: "Kansas City",
        STATE: "MO",
        ZIP: "64111",
        COUNTY: "Jackson",
        PHONE: "816-555-0101",
        MIN_AGE: "0",
        MAX_AGE: "12",
        TOTAL: 84,
        LATITUDE: 39.0997,
        LONGITUDE: -94.5786,
      },
    },
    {
      attributes: {
        OBJECTID: 2,
        SITE_TYPE: "LICENSED",
        STATUS: "CLOSED",
        FACILITY: "Closed Center",
        DVN: "009999999",
        ADDRESS: "200 Main St",
        CITY: "Kansas City",
        STATE: "MO",
        ZIP: "64111",
        COUNTY: "Jackson",
        PHONE: "816-555-0199",
        MIN_AGE: "0",
        MAX_AGE: "12",
        TOTAL: 40,
        LATITUDE: 39.1,
        LONGITUDE: -94.58,
      },
    },
    {
      attributes: {
        OBJECTID: 3,
        SITE_TYPE: "LICENSED",
        STATUS: "OPEN",
        FACILITY: "Out of State Row",
        DVN: "008888888",
        ADDRESS: "300 Main St",
        CITY: "Overland Park",
        STATE: "KS",
        ZIP: "66204",
        COUNTY: "Johnson",
        PHONE: "913-555-0199",
        MIN_AGE: "0",
        MAX_AGE: "12",
        TOTAL: 40,
        LATITUDE: 38.98,
        LONGITUDE: -94.67,
      },
    },
  ],
};

const providers = parseMissouriChildCareFeatures(payload);
assert.equal(providers.length, 1, "only active Missouri facilities should become referral candidates");
assert.equal(providers[0].name, "Purple Steps Preschool");
assert.equal(providers[0].licenseId, "001234567");
assert.equal(providers[0].capacity, 84);
assert.equal(providers[0].city, "Kansas City");
assert.equal(providers[0].county, "Jackson");
assert.equal(providers[0].phone, "816-555-0101");
assert.equal(providers[0].sourceId, "mo-dhss-child-care-gis");
assert.ok(providers[0].sourceUrl.includes("gis.mo.gov"));

const observations = buildMissouriChildCareObservations(providers, 10_000);
const density = observations.find((item) => item.indicatorId === "referral-ecosystem.07");
assert(density, "licensed child-care density observation should be emitted");
assert.equal(density.value, 5, "one provider per 10,000 children should normalize to 5/100 when 20 per 10k is strong");
assert.equal(density.confidence, 92);
assert.deepEqual(density.sourceIds, ["mo-dhss-child-care-gis"]);

assert.deepEqual(
  stateSourceSelection("MO", "client"),
  { missouriChildCare: true, kansasEarlyIntervention: false },
  "Missouri Client research should use the Missouri child-care source",
);
assert.equal(stateSourceSelection("MO", "rbt").missouriChildCare, false, "RBT recruiting should not run the child-care collector");
assert.equal(stateSourceSelection("MO", "bcba").missouriChildCare, false, "BCBA recruiting should not run the child-care collector");
assert.equal(stateSourceSelection("KS", "client").missouriChildCare, false, "Kansas research must never call the Missouri collector");

const twoProviders = [
  providers[0],
  { ...providers[0], id: "001234568", licenseId: "001234568", name: "Second Steps Preschool", address: "101 Main St" },
];
const resolvedFacilities = resolveSearchHits(
  missouriChildCareToSearchHits(twoProviders, "Kansas City, MO").map((hit) => ({ lane: "referral" as const, hit, enrichment: null })),
  "Kansas City, MO",
);
assert.equal(resolvedFacilities.length, 2, "state GIS evidence host must not collapse distinct facilities into one entity");
assert.deepEqual(resolvedFacilities.map((lead) => lead.name).sort(), ["Purple Steps Preschool", "Second Steps Preschool"]);

const clientContribution = buildStateSourceContribution({
  state: "MO",
  engine: "client",
  location: "Kansas City, MO",
  under18Population: 10_000,
  missouriChildCare: twoProviders,
});
assert.equal(clientContribution.referralHits.length, 2, "Missouri Client research should contribute official child-care referral hits");
assert.equal(clientContribution.observations.length, 1, "Missouri Client research should contribute child-care density evidence when population is known");
assert.equal(clientContribution.observations[0].indicatorId, "referral-ecosystem.07");
assert.equal(clientContribution.sourceDetail, "2 official Missouri DHSS child-care facilities");

assert.deepEqual(
  buildStateSourceContribution({ state: "MO", engine: "rbt", location: "Kansas City, MO", under18Population: 10_000, missouriChildCare: twoProviders }),
  { referralHits: [], observations: [], sourceDetail: null },
  "Missouri RBT research must not inject child-care leads",
);
assert.deepEqual(
  buildStateSourceContribution({ state: "KS", engine: "client", location: "Kansas", under18Population: 10_000, missouriChildCare: twoProviders }),
  { referralHits: [], observations: [], sourceDetail: null },
  "Kansas research must not consume Missouri child-care records",
);

let missouriCollectorCalls = 0;
const runtimeContribution = await collectStateSourceContribution(
  { state: "MO", engine: "client", location: "Kansas City, MO", under18Population: 10_000 },
  {
    searchMissouriChildCare: async (location) => {
      missouriCollectorCalls += 1;
      assert.equal(location, "Kansas City, MO");
      return twoProviders;
    },
  },
);
assert.equal(missouriCollectorCalls, 1, "Missouri Client runtime should call the official child-care collector once");
assert.equal(runtimeContribution.referralHits.length, 2);
assert.equal(runtimeContribution.observations[0].indicatorId, "referral-ecosystem.07");

const skippedRuntimeContribution = await collectStateSourceContribution(
  { state: "MO", engine: "rbt", location: "Kansas City, MO", under18Population: 10_000 },
  {
    searchMissouriChildCare: async () => {
      missouriCollectorCalls += 1;
      return twoProviders;
    },
  },
);
assert.equal(missouriCollectorCalls, 1, "RBT runtime must not call the Missouri child-care collector");
assert.deepEqual(skippedRuntimeContribution, { referralHits: [], observations: [], sourceDetail: null });

const genericLead = resolveSearchHits([
  {
    lane: "referral" as const,
    hit: {
      title: "Community Pediatrics",
      url: "https://community-pediatrics.example",
      snippet: "Pediatric referral clinic serving Kansas City families",
      query: "Kansas City pediatric referral clinic",
      sourceId: "test-public-web",
      rank: 1,
    },
    enrichment: null,
  },
], "Kansas City, MO")[0];
const mergedLeads = mergeStateSourceLeads([genericLead], runtimeContribution, "Kansas City, MO", 10);
assert.equal(mergedLeads.length, 3, "official state leads should merge alongside ordinary referral leads");
assert.deepEqual(
  mergedLeads.map((lead) => lead.name).sort(),
  ["Community Pediatrics", "Purple Steps Preschool", "Second Steps Preschool"],
);
assert.equal(
  mergedLeads.filter((lead) => lead.name.includes("Steps Preschool")).every((lead) =>
    lead.evidence.some((evidence) => evidence.sourceId === "mo-dhss-child-care-gis")
  ),
  true,
  "merged official facilities should retain Missouri DHSS evidence",
);

console.log("Missouri/Kansas state source verification passed.");
