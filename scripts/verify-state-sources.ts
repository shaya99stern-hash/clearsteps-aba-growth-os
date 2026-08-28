import assert from "node:assert/strict";
import {
  parseMissouriChildCareFeatures,
  buildMissouriChildCareObservations,
} from "../lib/intelligence/official/mo-child-care-gis";
import { stateSourceSelection } from "../lib/intelligence/official/state-source-selection";

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

console.log("Missouri/Kansas state source verification passed.");
