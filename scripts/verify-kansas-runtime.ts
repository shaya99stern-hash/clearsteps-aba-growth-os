import assert from "node:assert/strict";
import {
  KANSAS_EARLY_INTERVENTION_SOURCE_URL,
  searchKansasEarlyIntervention,
} from "../lib/intelligence/official/ks-early-intervention";
import { collectStateSourceContribution } from "../lib/intelligence/official/state-source-contribution";

const rosterHtml = `
  <main>
    <a href="/DocumentCenter/View/51016/KS16-Johnson-County-Infant-Toddler-Services-PDF">KS16 Johnson County Infant-Toddler Services (PDF)</a>
    <a href="/DocumentCenter/View/51037/KS37-Wyandotte-County-Infant-Toddler-Services-PDF">KS37 Wyandotte County Infant-Toddler Services (PDF)</a>
  </main>
`;

const requests: string[] = [];
const programs = await searchKansasEarlyIntervention(
  "Johnson County, KS",
  async (input, init) => {
    requests.push(String(input));
    assert.equal(String(input), KANSAS_EARLY_INTERVENTION_SOURCE_URL, "collector should request only the current KDHE roster page");
    assert(init?.signal, "collector should use a bounded abort signal");
    return new Response(rosterHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
);

assert.deepEqual(requests, [KANSAS_EARLY_INTERVENTION_SOURCE_URL]);
assert.deepEqual(programs.map((program) => program.id), ["KS16"], "runtime should conservatively filter the current roster to the explicit county");
assert.equal(programs[0].sourceUrl.includes("/DocumentCenter/View/51016/"), true, "program evidence should point at the official KDHE report");

const statewide = await searchKansasEarlyIntervention(
  "Kansas",
  async () => new Response(rosterHtml, { status: 200, headers: { "content-type": "text/html" } }),
);
assert.equal(statewide.length, 2, "statewide runtime should retain the current active program roster");

await assert.rejects(
  () => searchKansasEarlyIntervention(
    "Kansas",
    async () => new Response("service unavailable", { status: 503, headers: { "content-type": "text/html" } }),
  ),
  /503/,
  "non-success KDHE responses should fail explicitly so Scout can mark the source unavailable",
);

let kansasCollectorCalls = 0;
let missouriCollectorCalls = 0;
const contribution = await collectStateSourceContribution(
  { state: "KS", engine: "client", location: "Johnson County, KS", under18Population: 50_000 },
  {
    searchMissouriChildCare: async () => {
      missouriCollectorCalls += 1;
      return [];
    },
    searchKansasEarlyIntervention: async (location) => {
      kansasCollectorCalls += 1;
      assert.equal(location, "Johnson County, KS");
      return programs;
    },
  },
);
assert.equal(kansasCollectorCalls, 1, "Kansas Client runtime should call the KDHE collector exactly once");
assert.equal(missouriCollectorCalls, 0, "Kansas runtime must never call the Missouri child-care collector");
assert.equal(contribution.referralHits.length, 1, "Kansas Client runtime should contribute official early-intervention referral evidence");
assert.equal(contribution.referralHits[0].sourceId, "ks-kdhe-tiny-k-reports");
assert.equal(contribution.observations.length, 1);
assert.equal(contribution.observations[0].indicatorId, "referral-ecosystem.09");
assert.equal(contribution.sourceDetail, "1 current Kansas KDHE early-intervention program");

const skippedContribution = await collectStateSourceContribution(
  { state: "KS", engine: "rbt", location: "Johnson County, KS", under18Population: 50_000 },
  {
    searchMissouriChildCare: async () => {
      missouriCollectorCalls += 1;
      return [];
    },
    searchKansasEarlyIntervention: async () => {
      kansasCollectorCalls += 1;
      return programs;
    },
  },
);
assert.equal(kansasCollectorCalls, 1, "Kansas RBT runtime must not call the KDHE early-intervention collector");
assert.equal(missouriCollectorCalls, 0, "Kansas RBT runtime must not call the Missouri collector");
assert.deepEqual(skippedContribution, { referralHits: [], observations: [], sourceDetail: null });

console.log("Kansas KDHE runtime verification passed.");
