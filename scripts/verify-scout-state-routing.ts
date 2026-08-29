import assert from "node:assert/strict";
import {
  collectScoutStateSource,
  scoutStateSourceDescriptor,
} from "../lib/intelligence/official/scout-state-source";
import type { KansasEarlyInterventionProgram } from "../lib/intelligence/official/ks-early-intervention";

const kansasPrograms: KansasEarlyInterventionProgram[] = [
  {
    id: "KS16",
    name: "Johnson County Infant-Toddler Services",
    sourceId: "ks-kdhe-tiny-k-reports",
    sourceUrl: "https://www.kdhe.ks.gov/DocumentCenter/View/51016/KS16-Johnson-County-Infant-Toddler-Services-PDF",
  },
];

const kansasDescriptor = scoutStateSourceDescriptor("KS", "client");
assert(kansasDescriptor, "Kansas Client research should expose a Scout state-source descriptor");
assert.equal(kansasDescriptor.source, "Kansas KDHE Early Intervention");
assert.match(kansasDescriptor.workingDetail, /KDHE/i);
assert.match(kansasDescriptor.emptyDetail, /0 current Kansas KDHE early-intervention programs/i);
assert.equal(kansasDescriptor.errorPrefix, "kansas early intervention");
assert.equal(scoutStateSourceDescriptor("KS", "rbt"), null, "Kansas RBT research must not expose the Client-only state source");
assert.equal(scoutStateSourceDescriptor("KS", "bcba"), null, "Kansas BCBA research must not expose the Client-only state source");

const missouriDescriptor = scoutStateSourceDescriptor("MO", "client");
assert(missouriDescriptor, "Missouri Client research should retain its Scout state-source descriptor");
assert.equal(missouriDescriptor.source, "Missouri DHSS Child Care");
assert.equal(scoutStateSourceDescriptor("MO", "rbt"), null);

let kansasCollectorCalls = 0;
let missouriCollectorCalls = 0;
const collected = await collectScoutStateSource(
  { state: "KS", engine: "client", location: "Johnson County, KS", under18Population: 50_000 },
  {
    searchMissouriChildCare: async () => {
      missouriCollectorCalls += 1;
      return [];
    },
    searchKansasEarlyIntervention: async (location) => {
      kansasCollectorCalls += 1;
      assert.equal(location, "Johnson County, KS");
      return kansasPrograms;
    },
  },
);
assert(collected, "Kansas Client Scout routing should collect the configured state source");
assert.equal(kansasCollectorCalls, 1);
assert.equal(missouriCollectorCalls, 0);
assert.equal(collected.descriptor.source, "Kansas KDHE Early Intervention");
assert.equal(collected.contribution.referralHits.length, 1);
assert.equal(collected.contribution.referralHits[0].sourceId, "ks-kdhe-tiny-k-reports");
assert.equal(collected.contribution.observations.length, 1);
assert.equal(collected.contribution.observations[0].indicatorId, "referral-ecosystem.09");

const skipped = await collectScoutStateSource(
  { state: "KS", engine: "rbt", location: "Johnson County, KS", under18Population: 50_000 },
  {
    searchMissouriChildCare: async () => {
      missouriCollectorCalls += 1;
      return [];
    },
    searchKansasEarlyIntervention: async () => {
      kansasCollectorCalls += 1;
      return kansasPrograms;
    },
  },
);
assert.equal(skipped, null, "non-Client Scout routing should skip the Kansas state source entirely");
assert.equal(kansasCollectorCalls, 1);
assert.equal(missouriCollectorCalls, 0);

console.log("Scout state-source routing verification passed.");
