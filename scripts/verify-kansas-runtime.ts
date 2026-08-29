import assert from "node:assert/strict";
import {
  KANSAS_EARLY_INTERVENTION_SOURCE_URL,
  searchKansasEarlyIntervention,
} from "../lib/intelligence/official/ks-early-intervention";

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

console.log("Kansas KDHE runtime verification passed.");
