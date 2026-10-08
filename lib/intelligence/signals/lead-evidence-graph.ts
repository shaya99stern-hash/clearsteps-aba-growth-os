import type { ResolvedLead, SearchEvidence } from "../source-types";
import { publicPublisherId, samePublicNarrative } from "./publisher-evidence";

/** One independent publisher and one genuinely distinct narrative per factual claim. */
export type EvidenceClaim =
  | "institution_exists" | "referral_pathway" | "service_available" | "service_unavailable"
  | "hiring" | "not_hiring" | "verified_public_contact";

export interface EvidenceGraphClaim {
  claim: EvidenceClaim;
  sourceCount: number;
  sourceDomains: string[];
  supported: boolean;
  authorityPresent: boolean;
}
export interface LeadEvidenceGraph {
  publishers: number;
  firstPartySources: number;
  governmentSources: number;
  institutionalSources: number;
  communitySources: number;
  claims: EvidenceGraphClaim[];
  contradictions: string[];
  posture: "conflicting" | "corroborated" | "single_source" | "no_evidence";
  /** Collection date; never substitute for original publication date. */
  observedAt: string | null;
  explanation: string;
}

const CLAIMS: readonly [EvidenceClaim, RegExp][] = [
  ["institution_exists", /\b(licensed (child ?care|preschool|facility)|npi\s*\d+|official (facility|provider)|organization directory)\b/i],
  ["referral_pathway", /\b(referral(s)? (accepted|form|partner|process|network)|refer (a|your) patient|accepts referrals)\b/i],
  ["service_available", /\b((now |currently )?accepting new (patients|clients|referrals)|now enrolling|intake reopened|new clinic opened)\b/i],
  ["service_unavailable", /\b(no longer accepting|not accepting new (patients|clients|referrals)|intake closed|wait ?list closed|permanently closed)\b/i],
  ["hiring", /\b(now hiring|we are hiring|apply now|job opening|open position|recruiting behavior)\b/i],
  ["not_hiring", /\b(not hiring|no open positions|hiring freeze|positions filled)\b/i],
  ["verified_public_contact", /\b(contact (us|the director)|call us|reach our team|referrals?@|intake@)\b/i],
];

function host(url: string) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch { return null; }
}

type PublisherType = "government" | "first_party" | "press" | "community" | "unverified";
function typeOfPublisher(source: SearchEvidence, domain: string, leadPublisher: string): PublisherType {
  if (/\.(gov|edu)$/.test(domain) ||
    /^(cms-|mo-dhss|co-cdec|ks-kdhe|census-)/.test(source.sourceId)) return "government";
  if (publicPublisherId(domain) === leadPublisher && leadPublisher) return "first_party";
  if (/(reddit|facebook|threads|nextdoor|quora|instagram|tiktok)\.(com|net)$/.test(domain)) return "community";
  if (/news|journal|gazette|post|times|tribune|daily|press|radio|publicmedia/.test(domain)) return "press";
  return "unverified";
}

/** Unknown .org/.com domains are not automatically authoritative organizations. */
export function buildLeadEvidenceGraph(
  lead: Pick<ResolvedLead, "kind" | "evidence" | "emails" | "phones" | "domain">,
): LeadEvidenceGraph {
  const leadPublisher = publicPublisherId(lead.domain ?? "");
  const publishers = new Map<string, { entries: SearchEvidence[]; type: PublisherType }>();
  for (const item of lead.evidence) {
    const domain = host(item.url);
    if (!domain) continue;
    const publisher = publicPublisherId(domain);
    if (!publisher) continue;
    const type = typeOfPublisher(item, domain, leadPublisher);
    const prior = publishers.get(publisher);
    if (prior) {
      prior.entries.push(item);
      if (type === "government" || type === "first_party") prior.type = type;
    } else publishers.set(publisher, { entries: [item], type });
  }
  const votes = new Map<EvidenceClaim, Set<string>>();
  const narratives = new Map<EvidenceClaim, string[]>();
  const authority = new Set<EvidenceClaim>();

  for (const [publisher, item] of publishers) {
    if (lead.kind === "community_signal" || item.type === "community") continue;
    for (const entry of item.entries) {
      const text = (entry.title + " " + entry.snippet).slice(0, 2000);
      for (const [claim, pattern] of CLAIMS) {
        if (!pattern.test(text)) continue;
        if (claim === "service_available" &&
          /\b(not accepting new|no longer accepting|intake closed|wait ?list closed)\b/i.test(text)) continue;
        const set = votes.get(claim) ?? new Set<string>();
        if (set.has(publisher)) continue;
        const prior = narratives.get(claim) ?? [];
        // Republishing the same report on a new domain is not new independent evidence.
        if (prior.some((candidate) => samePublicNarrative(candidate, text))) continue;
        prior.push(text);
        narratives.set(claim, prior);
        set.add(publisher);
        votes.set(claim, set);
        if (item.type === "government" || item.type === "first_party") authority.add(claim);
      }
    }
  }
  const published = (claim: EvidenceClaim) => (votes.get(claim)?.size ?? 0) > 0;
  const contradictions: string[] = [
    ...(published("service_available") && published("service_unavailable")
      ? ["Conflicting published intake-availability claims; confirm applicable dates directly"] : []),
    ...(published("hiring") && published("not_hiring")
      ? ["Conflicting public hiring status; confirm with employer"] : []),
  ];
  const conflictingClaims = new Set<EvidenceClaim>();
  if (published("service_available") && published("service_unavailable")) {
    conflictingClaims.add("service_available"); conflictingClaims.add("service_unavailable");
  }
  if (published("hiring") && published("not_hiring")) {
    conflictingClaims.add("hiring"); conflictingClaims.add("not_hiring");
  }
  const claims = [...votes.entries()].map(([claim, domains]): EvidenceGraphClaim => ({
    claim, sourceCount: domains.size, sourceDomains: [...domains].slice(0, 10),
    supported: domains.size >= 2 && authority.has(claim) && !conflictingClaims.has(claim),
    authorityPresent: authority.has(claim),
  }));
  const count = publishers.size;
  const firstPartySources = [...publishers.values()].filter((item) => item.type === "first_party").length;
  const governmentSources = [...publishers.values()].filter((item) => item.type === "government").length;
  const communitySources = [...publishers.values()].filter((item) => item.type === "community").length;
  const confirmed = claims.filter((claim) => claim.supported).length;
  const posture: LeadEvidenceGraph["posture"] = contradictions.length ? "conflicting" :
    count === 0 ? "no_evidence" : confirmed > 0 ? "corroborated" : "single_source";
  const dates = lead.evidence.map((item) => item.capturedAt).filter((item) => Number.isFinite(Date.parse(item))).sort();
  return {
    publishers: count,
    firstPartySources,
    governmentSources,
    institutionalSources: firstPartySources,
    communitySources,
    claims,
    contradictions,
    posture,
    observedAt: dates.at(-1) ?? null,
    explanation: posture === "conflicting"
      ? "Public sources disagree. Resolve dated conflicts before qualification or outreach."
      : posture === "corroborated"
      ? confirmed + " distinct claim(s) have both primary-source evidence and independent corroboration."
      : "Independent, non-duplicated primary-source corroboration is insufficient; research candidate only.",
  };
}
