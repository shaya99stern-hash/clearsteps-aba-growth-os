import { choosePublicSourceChannels, queryForPublicSource } from "./signals/source-channel-catalog";
import type { LeadEngine } from "./phase3/indicator-catalog";
import { understandAbaRequest, type AbaLanguageReading } from "./aba-language";

export type SearchLane = "referral" | "talent" | "community" | "market";

export interface SearchPlan {
  input: string;
  location: string;
  engine?: LeadEngine;
  lanes: SearchLane[];
  queries: Array<{ lane: SearchLane; query: string }>;
  safeguards: string[];
  interpretation: AbaLanguageReading;
}

const LANE_TERMS: Record<SearchLane, string[]> = {
  referral: ["referral", "daycare", "preschool", "psychologist", "pediatric", "speech", "occupational", "ot", "slp", "client"],
  talent: ["rbt", "bcba", "behavior technician", "analyst", "hire", "hiring", "candidate", "staff"],
  community: ["need", "waitlist", "wait list", "shortage", "reddit", "facebook", "community", "parent", "autism services"],
  market: ["competitor", "market", "provider", "territory", "expansion", "opening", "closing", "demand"],
};

export function buildSearchPlan(input: string, location: string, engine?: LeadEngine, state?: "MO" | "KS" | "CO"): SearchPlan {
  const interpretation = understandAbaRequest(input, engine);
  const normalized = interpretation.corrected;
  const padded = " " + normalized + " ";
  const inferred = (Object.keys(LANE_TERMS) as SearchLane[]).filter((lane) =>
    LANE_TERMS[lane].some((term) => padded.includes(" " + term + " ")),
  );
  const kinds = new Set(interpretation.recognized.map((term) => term.kind));
  if (kinds.has("referral") || kinds.has("client")) inferred.push("referral");
  if (kinds.has("community")) inferred.push("community");
  if (kinds.has("market")) inferred.push("market");
  if (kinds.has("staffing")) inferred.push("talent");
  const selected = engine
    ? lanesForEngine(engine)
    : inferred.length
      ? Array.from(new Set(inferred))
      : (["referral", "community", "market"] as SearchLane[]);
  const place = location.trim();
  const queries: Array<{ lane: SearchLane; query: string }> = [];
  for (const lane of selected) queries.push(...laneQueries(lane, normalized, place, engine));

  const targeted = state && engine
    ? choosePublicSourceChannels(state, engine, place + " " + normalized, 6, Math.floor(Date.now() / 86_400_000)).map((channel) => ({
        lane: (channel.kind === "workforce" ? "talent" : channel.kind === "press" || channel.kind === "community" ? "community" : "referral") as SearchLane,
        query: queryForPublicSource(channel, place, engine),
      }))
    : [];
  const expanded = interpretation.suggestedQueries.map((phrase) => ({
    lane: (interpretation.interpretedGoal === "rbt_recruiting" || interpretation.interpretedGoal === "bcba_recruiting"
      ? "talent" : "referral") as SearchLane,
    query: (phrase + " " + place).trim(),
  }));
  return {
    input,
    interpretation,
    location: place,
    engine,
    lanes: selected,
    // The limited live search budget must find actual local institutions first.
    // Do not spend 10 of 15 real searches on rotating catalog domains.
    queries: Array.from(new Map([
      ...queries.filter((row)=>row.lane==="referral").slice(0,4),
      ...queries.filter((row)=>row.lane==="talent").slice(0,4),
      ...queries.filter((row)=>row.lane==="market").slice(0,4),
      ...queries.filter((row)=>row.lane==="community").slice(0,2),
      ...expanded,
      ...targeted,
      ...queries,
    ].map((row)=>[`${row.lane}:${row.query}`, row])).values()).slice(0, 20),
    safeguards: [
      "Public organization/professional information only.",
      "Community discussions are aggregated as territory demand signals; no parent/child profiles.",
      "Private groups, authenticated pages, CAPTCHA bypass, and household-level disability targeting are excluded.",
      "Verification-only registries are never treated as recruiting lists.",
      "New Scout research is restricted to Missouri, Kansas, and Colorado.",
    ],
  };
}

function lanesForEngine(engine: LeadEngine): SearchLane[] {
  if (engine === "client") return ["referral", "community", "market"];
  return ["talent", "market"];
}

function laneQueries(lane: SearchLane, input: string, location: string, engine?: LeadEngine): Array<{ lane: SearchLane; query: string }> {
  const place = location ? ` ${location}` : "";
  if (lane === "referral") return [
    { lane, query: `licensed daycare preschool early childhood${place}` },
    { lane, query: `child psychologist autism developmental evaluation pediatric${place}` },
    { lane, query: `pediatric speech occupational therapy developmental${place}` },
    { lane, query: `developmental pediatrician child find early intervention${place}` },
    { lane, query: `${input}${place}` },
  ];
  if (lane === "talent") {
    const roleTerms = engine === "bcba"
      ? ["BCBA LBA hiring behavior analyst", "BCBA clinical director hiring", "behavior analyst careers BCBA LBA"]
      : ["RBT hiring behavior technician", "registered behavior technician hiring", "ABA careers RBT behavior technician"];
    return [
      ...roleTerms.map((term) => ({ lane, query: `${term}${place}` })),
      { lane, query: `${input}${place}` },
    ];
  }
  if (lane === "community") return [
    { lane, query: `site:reddit.com ABA waitlist autism services${place}` },
    { lane, query: `site:reddit.com autism evaluation waitlist children${place}` },
    { lane, query: `"ABA" "waitlist"${place}` },
    { lane, query: `autism developmental services shortage${place}` },
    { lane, query: `site:facebook.com public resource community events${place}` },
    { lane, query: `local paper child services capacity waitlist${place}` },
    { lane, query: `municipal accessibility awareness campaign${place}` },
  ];
  return [
    { lane, query: `ABA therapy provider${place}` },
    { lane, query: `ABA therapy hiring RBT BCBA${place}` },
    { lane, query: `ABA therapy new location expansion closure${place}` },
    { lane, query: `county health needs assessment child developmental services${place}` },
    { lane, query: `special education school board meeting workforce${place}` },
    { lane, query: `Medicaid provider network ABA update${place}` },
    { lane, query: `${input}${place}` },
  ];
}
