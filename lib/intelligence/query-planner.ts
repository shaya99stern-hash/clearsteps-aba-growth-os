import type { LeadEngine } from "./phase3/indicator-catalog";

export type SearchLane = "referral" | "talent" | "community" | "market";

export interface SearchPlan {
  input: string;
  location: string;
  engine?: LeadEngine;
  lanes: SearchLane[];
  queries: Array<{ lane: SearchLane; query: string }>;
  safeguards: string[];
}

const LANE_TERMS: Record<SearchLane, string[]> = {
  referral: ["referral", "daycare", "preschool", "psychologist", "pediatric", "speech", "occupational", "ot", "slp", "client"],
  talent: ["rbt", "bcba", "behavior technician", "analyst", "hire", "hiring", "candidate", "staff"],
  community: ["need", "waitlist", "wait list", "shortage", "reddit", "facebook", "community", "parent", "autism services"],
  market: ["competitor", "market", "provider", "territory", "expansion", "opening", "closing", "demand"],
};

export function buildSearchPlan(input: string, location: string, engine?: LeadEngine): SearchPlan {
  const normalized = input.toLowerCase();
  const inferred = (Object.keys(LANE_TERMS) as SearchLane[]).filter((lane) =>
    LANE_TERMS[lane].some((term) => normalized.includes(term)),
  );
  const selected = engine
    ? lanesForEngine(engine)
    : inferred.length
      ? inferred
      : (["referral", "community", "market"] as SearchLane[]);
  const place = location.trim();
  const queries: Array<{ lane: SearchLane; query: string }> = [];
  for (const lane of selected) queries.push(...laneQueries(lane, input, place, engine));

  return {
    input,
    location: place,
    engine,
    lanes: selected,
    queries: Array.from(new Map(queries.map((row) => [`${row.lane}:${row.query}`, row])).values()).slice(0, 18),
    safeguards: [
      "Public organization/professional information only.",
      "Community discussions are aggregated as territory demand signals; no parent/child profiles.",
      "Private groups, authenticated pages, CAPTCHA bypass, and household-level disability targeting are excluded.",
      "Verification-only registries are never treated as recruiting lists.",
      "New Scout research is restricted to Missouri and Kansas.",
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
  ];
  return [
    { lane, query: `ABA therapy provider${place}` },
    { lane, query: `ABA therapy hiring RBT BCBA${place}` },
    { lane, query: `ABA therapy new location expansion closure${place}` },
    { lane, query: `${input}${place}` },
  ];
}
