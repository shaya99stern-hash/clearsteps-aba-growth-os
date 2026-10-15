// 150 v6 public sources and 200 client-acquisition narrowing signals: catalog integrity, matching,
// state gating, hunting queries and lead ranking.
import assert from "node:assert/strict";
import { V6_PUBLIC_SOURCE_CHANNELS } from "../lib/intelligence/signals/v6-source-channels";
import { PUBLIC_SOURCE_CHANNELS, choosePublicSourceChannels, isAggregateOnlyPublicSourceUrl } from "../lib/intelligence/signals/source-channel-catalog";
import {
  CLIENT_NARROWING_SIGNALS,
  NARROWING_DIMENSIONS,
  clientNarrowingQueries,
  matchNarrowingSignals,
  narrowLead,
  summarizeNarrowing,
  withNarrowing,
} from "../lib/intelligence/signals/client-narrowing";
import type { ResolvedLead } from "../lib/intelligence/source-types";

// Sources
assert.equal(V6_PUBLIC_SOURCE_CHANNELS.length, 150, "150 new public sources");
const scopes = V6_PUBLIC_SOURCE_CHANNELS.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.scope]: (acc[item.scope] ?? 0) + 1 }), {});
assert.deepEqual(scopes, { MO: 35, KS: 35, CO: 35, federal: 20, national: 25 });
assert.equal(new Set(PUBLIC_SOURCE_CHANNELS.map((item) => item.host)).size, PUBLIC_SOURCE_CHANNELS.length, "no host duplicates any earlier source");
assert(V6_PUBLIC_SOURCE_CHANNELS.every((item) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(item.host) && item.focus && item.method === "site-search"));
for (const state of ["MO", "KS", "CO"] as const) {
  const runs = Array.from({ length: 35 }, (_, rotation) => choosePublicSourceChannels(state, "client", "City, " + state, 6, rotation));
  assert(runs.every((selected) => selected.some((item) => V6_PUBLIC_SOURCE_CHANNELS.includes(item) && item.scope === state)), `${state}: every run searches a v6 state source`);
  const reached = new Set(runs.flat().filter((item) => V6_PUBLIC_SOURCE_CHANNELS.includes(item) && item.scope === state).map((item) => item.host));
  assert(reached.size >= 15, `${state}: rotation reaches the v6 state catalog (${reached.size})`);
}
assert(isAggregateOnlyPublicSourceUrl("https://mochildcareaware.org/resource/x"), "aggregate-only applies to v6 sources");
assert(isAggregateOnlyPublicSourceUrl("https://ks.childcareaware.org/data-research/"), "earlier aggregate-only sources still apply");
assert(!isAggregateOnlyPublicSourceUrl("https://www.ssdmo.org/"));

// Signals
assert.equal(CLIENT_NARROWING_SIGNALS.length, 200, "200 narrowing signals");
assert.equal(new Set(CLIENT_NARROWING_SIGNALS.map((signal) => signal.id)).size, 200);
assert.equal(new Set(CLIENT_NARROWING_SIGNALS.map((signal) => signal.name)).size, 200, "no duplicate signal names");
assert.equal(Object.keys(NARROWING_DIMENSIONS).length, 20);
for (const dimension of Object.keys(NARROWING_DIMENSIONS)) {
  assert.equal(CLIENT_NARROWING_SIGNALS.filter((signal) => signal.dimension === dimension).length, 10, `${dimension} has 10 signals`);
}
assert(CLIENT_NARROWING_SIGNALS.every((signal) => signal.terms.length > 0 && signal.terms.every((term) => term === term.toLowerCase())));

const names = (text: string, state: "MO" | "KS" | "CO") => matchNarrowingSignals(text, state).map((signal) => signal.name);
assert(names("We are a MO HealthNet provider and accept Home State Health.", "MO").includes("MO HealthNet"));
assert(!names("We are a MO HealthNet provider.", "KS").includes("MO HealthNet"), "state programs only count in their state");
assert(names("Johnson County tiny-k program", "KS").includes("Kansas tiny-k early intervention"));
assert(names("Funded by the Boone County Children’s Services Fund", "MO").includes("Children's Services Fund"), "curly apostrophes normalize");
assert(!names("Tornados hit the county", "MO").includes("ADOS assessment"), "whole-word matching only");
assert(names("Developmental pediatrics clinic with ADOS-2 testing", "CO").includes("ADOS assessment"));
assert(!names("Our ABA clinic has openings", "MO").includes("ABA waitlist"), "multi-term signals need every term");
assert(names("ABA intake has a waitlist of six months", "MO").includes("ABA waitlist"));

// Lead ranking
const lead = (name: string, snippets: string[]): ResolvedLead => ({
  id: name, name, kind: "referral", score: 50, confidence: 50, reasons: ["Found in public search"], unknowns: [],
  emails: [], phones: [], signals: [],
  evidence: snippets.map((snippet, index) => ({ id: name + index, sourceId: "duckduckgo-html", title: name, url: "https://example.org/" + index, snippet, query: "q", capturedAt: "", purpose: "discover" as const })),
});
const gateway = narrowLead(lead("Springfield First Steps", [
  "First Steps early intervention System Point of Entry; developmental screening and Child Find for ages 0-3; MO HealthNet accepted.",
  "Referrals from pediatrician offices; autism evaluation waitlist and a long wait for ABA.",
]), "MO");
const generic = narrowLead(lead("Springfield Coffee Co", ["Coffee and pastries downtown."]), "MO");
const synonyms = narrowLead(lead("Bilingual Center", ["Spanish bilingual se habla español interpreter Vietnamese Arabic Somali refugee"]), "MO");
assert(gateway.score >= 60, `referral gateway scores high (${gateway.score})`);
assert.equal(generic.score, 0);
assert(gateway.score > synonyms.score, "many synonyms in one dimension cannot outrank multi-dimension evidence");
assert(gateway.roles.includes("referral pathway") && gateway.roles.includes("payer fit") && gateway.roles.includes("unmet demand"));
assert.equal(gateway.priorityBonus, Math.round(gateway.score / 4));
assert(gateway.matched[0].weight >= gateway.matched.at(-1)!.weight, "matched signals sorted by weight");

const tagged = withNarrowing(lead("Springfield First Steps", ["First Steps early intervention"]), narrowLead(lead("x", ["First Steps early intervention"]), "MO"));
assert.match(tagged.reasons[0], /^Client fit \d+\/100: Missouri First Steps early intervention/);
assert(tagged.signals.includes("referral pathway"));
const untouched = lead("Plain", ["nothing relevant"]);
assert.equal(withNarrowing(untouched, narrowLead(untouched, "MO")), untouched, "no matches leaves the lead unchanged");

// Hunting queries
for (const state of ["MO", "KS", "CO"] as const) {
  const queries = clientNarrowingQueries(state, "Greene County, " + state, 3, 6);
  assert.equal(queries.length, 6);
  assert(queries.every((query) => query.includes("Greene County")), "every hunting query is localized");
  assert(queries.some((query) => query.startsWith("site:")), "hunting includes v6 publisher site searches");
  const daily = new Set(Array.from({ length: 30 }, (_, day) => clientNarrowingQueries(state, "X", day, 6)).flat());
  assert(daily.size >= 30, `${state}: daily rotation varies the hunt (${daily.size} distinct queries)`);
}
assert(clientNarrowingQueries("MO", "Joplin", 0, 6).some((query) => /First Steps|SB 40|Children's Services Fund|MO HealthNet/.test(query)), "Missouri gateways are hunted");
assert(!clientNarrowingQueries("MO", "Joplin", 0, 6).some((query) => /KanCare|tiny-k|Community Centered Board/.test(query)), "no other-state programs");

const summary = summarizeNarrowing(["q1", "q2"], [gateway, generic, synonyms]);
assert.equal(summary.signals, 200);
assert.equal(summary.leadsMatched, 2);
assert.equal(summary.strongLeads, 1);
assert(summary.topSignals.length > 0);

console.log(`Client narrowing: ${V6_PUBLIC_SOURCE_CHANNELS.length} v6 sources (${PUBLIC_SOURCE_CHANNELS.length} total), ${CLIENT_NARROWING_SIGNALS.length} signals across 20 dimensions, hunting and ranking verified.`);
