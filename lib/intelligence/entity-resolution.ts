import type { EnrichedWebsite, PublicSearchHit, ResolvedLead, SearchEvidence } from "./source-types";
import type { SearchLane } from "./query-planner";

export function resolveSearchHits(
  rows: Array<{ lane: SearchLane; hit: PublicSearchHit; enrichment?: EnrichedWebsite | null }>,
  location: string,
): ResolvedLead[] {
  const buckets = new Map<string, Array<(typeof rows)[number]>>();
  for (const row of rows) {
    const key = entityKey(row.hit, row.lane);
    const current = buckets.get(key) ?? [];
    current.push(row);
    buckets.set(key, current);
  }

  return [...buckets.entries()]
    .map(([key, matches]) => toLead(key, matches, location))
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);
}

function toLead(
  key: string,
  matches: Array<{ lane: SearchLane; hit: PublicSearchHit; enrichment?: EnrichedWebsite | null }>,
  location: string,
): ResolvedLead {
  const first = matches[0];
  const domain = getDomain(first.hit.url);
  const evidence: SearchEvidence[] = matches.map(({ hit, lane }, index) => ({
    id: `${key}-${index + 1}`,
    sourceId: hit.sourceId,
    title: lane === "community" ? "Public community discussion" : hit.title,
    url: hit.url,
    snippet: redactCommunityIdentity(hit.snippet, lane),
    query: hit.query,
    capturedAt: new Date().toISOString(),
    purpose: lane === "community" ? "monitor" : "discover",
    geography: location || undefined,
  }));

  const enrichments = matches.map((row) => row.enrichment).filter(Boolean) as EnrichedWebsite[];
  for (const [index, enrichment] of enrichments.entries()) {
    evidence.push({
      id: `${key}-site-${index + 1}`,
      sourceId: "public-website",
      title: enrichment.title || domain || "Public website",
      url: enrichment.finalUrl,
      snippet: enrichment.textSample.slice(0, 700),
      query: "direct website enrichment",
      capturedAt: enrichment.fetchedAt,
      purpose: "enrich",
      geography: location || undefined,
    });
  }

  const lanes = new Set(matches.map((row) => row.lane));
  const text = matches.map((row) => `${row.hit.title} ${row.hit.snippet} ${row.enrichment?.textSample ?? ""}`).join(" ").toLowerCase();
  const kind = lanes.has("talent")
    ? looksLikeIndividualCandidate(text) ? "candidate" : "talent_signal"
    : lanes.has("community") && lanes.size === 1
      ? "community_signal"
      : text.includes("aba") || text.includes("applied behavior")
        ? "organization"
        : "referral";
  const emails = Array.from(new Set(enrichments.flatMap((item) => item.emails)));
  const phones = Array.from(new Set(enrichments.flatMap((item) => item.phones)));

  const signals = signalTerms(text);
  const independentQueries = new Set(matches.map((row) => row.hit.query)).size;
  const contactability = Math.min(20, emails.length * 8 + phones.length * 7 + (domain ? 5 : 0));
  const crossReference = Math.min(25, independentQueries * 6 + Math.max(0, evidence.length - matches.length) * 5);
  const relevance = Math.min(35, signals.length * 5 + (lanes.has("referral") ? 8 : 0) + (lanes.has("talent") ? 8 : 0));
  const geography = location ? 10 : 4;
  const score = Math.min(100, contactability + crossReference + relevance + geography + 10);
  const confidence = Math.min(100, 25 + independentQueries * 12 + enrichments.length * 18 + (domain ? 8 : 0));

  return {
    id: key,
    name: kind === "community_signal" ? "Area-level public community demand signal" : cleanName(first.hit.title),
    kind,
    domain,
    website: first.hit.url,
    location: location || undefined,
    score,
    confidence,
    reasons: [
      `${evidence.length} public evidence record${evidence.length === 1 ? "" : "s"}`,
      `${independentQueries} independent search path${independentQueries === 1 ? "" : "s"}`,
      signals.length ? `Signals: ${signals.slice(0, 4).join(", ")}` : "General category/location relevance",
      emails.length || phones.length ? "Direct public contact data found on website" : "Contact enrichment still needed",
    ],
    unknowns: [
      ...(emails.length || phones.length ? [] : ["Decision-maker contact not verified"]),
      ...(confidence >= 70 ? [] : ["Additional independent source recommended"]),
    ],
    emails,
    phones,
    evidence,
    signals,
  };
}

function entityKey(hit: PublicSearchHit, lane: SearchLane) {
  if (lane === "community") return `community-${slug(hit.url)}`;
  const domain = getDomain(hit.url);
  if (domain && !isAggregatorDomain(domain)) return `domain-${slug(domain)}`;
  return `name-${slug(hit.title)}-${slug(domain ?? "")}`;
}

function isAggregatorDomain(domain: string) {
  return ["reddit.com", "facebook.com", "linkedin.com", "youtube.com", "yelp.com", "google.com"].some(
    (item) => domain === item || domain.endsWith(`.${item}`),
  );
}

function getDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function cleanName(value: string) {
  return value.replace(/\s+[|–—-]\s+.*$/, "").trim().slice(0, 160) || "Untitled public result";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function looksLikeIndividualCandidate(text: string) {
  const credential = ["rbt", "bcba", "behavior technician", "behavior analyst"].some((term) => text.includes(term));
  const seeking = ["seeking", "looking for work", "available for", "resume", "curriculum vitae", "open to work"].some((term) => text.includes(term));
  const employerPosting = ["we are hiring", "now hiring", "job opening", "apply now", "careers"].some((term) => text.includes(term));
  return credential && seeking && !employerPosting;
}

function signalTerms(text: string) {
  const terms = [
    "autism", "aba", "applied behavior", "daycare", "preschool", "psychologist", "evaluation",
    "pediatric", "speech", "occupational", "early intervention", "child find", "rbt", "bcba",
    "hiring", "waitlist", "wait list", "special needs", "developmental",
  ];
  return terms.filter((term) => text.includes(term));
}

function redactCommunityIdentity(value: string, lane: SearchLane) {
  if (lane !== "community") return value;
  return value
    .replace(/u\/[A-Za-z0-9_-]+/g, "community member")
    .replace(/@[A-Za-z0-9_.-]+/g, "community account")
    .slice(0, 700);
}
