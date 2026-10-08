import type { ResolvedLead, SearchEvidence } from "../source-types";

/** One independent publisher contributes at most one vote per factual claim. */
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
  /** Capture is NOT the original publication date and not evidence of current availability. */
  observedAt: string | null;
  explanation: string;
}

const POSITIVE: Array<[EvidenceClaim, RegExp]> = [
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
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return null; }
}
function publicationGroup(value: string) {
  // Subdomains of the same publisher are not treated as independent.
  const parts = value.split(".");
  if (parts.length < 3) return value;
  if (value.endsWith(".gov")) {
    // An agency's subdomain isn't independent from its parent agency.
    // State agency hostnames are otherwise kept distinct.
    return value;
  }
  if (value.endsWith(".co.uk")) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}
function category(item: SearchEvidence, domain: string) {
  if (/\.(gov|edu)$/.test(domain) || item.sourceId.startsWith("cms-") ||
    item.sourceId.startsWith("mo-dhss") || item.sourceId.startsWith("co-cdec") ||
    item.sourceId.startsWith("ks-kdhe")) return "government" as const;
  if (/(reddit|facebook|threads|nextdoor|quora)\.com$/.test(domain)) return "community" as const;
  if (/(press|times|news|post|tribune|journal|publicradio|sun)\./i.test(domain)) return "press" as const;
  return "institution" as const;
}

/** Evidence is scoped to one organization or a territorial community signal, never a family. */
export function buildLeadEvidenceGraph(lead: Pick<ResolvedLead, "kind" | "evidence" | "emails" | "phones">): LeadEvidenceGraph {
  const publishers = new Map<string, {items: SearchEvidence[]; type: ReturnType<typeof category>}>();
  for (const item of lead.evidence) {
    const domain = host(item.url);
    if (!domain) continue;
    const key = publicationGroup(domain);
    const bucket = publishers.get(key) ?? {items: [], type: category(item, domain)};
    bucket.items.push(item);
    publishers.set(key, bucket);
  }
  const claimSources = new Map<EvidenceClaim, Set<string>>();
  const claimAuthority = new Set<EvidenceClaim>();
  for (const [domain, publisher] of publishers) {
    if (lead.kind === "community_signal") continue;
    for (const entry of publisher.items) {
      const text = [entry.title, entry.snippet].join(" ").slice(0, 2000);
      for (const [claim, pattern] of POSITIVE) {
        if (!pattern.test(text)) continue;
        const votes = claimSources.get(claim) ?? new Set();
        votes.add(domain);
        claimSources.set(claim, votes);
        if (publisher.type === "government" || publisher.type === "institution") claimAuthority.add(claim);
      }
    }
  }
  const claims = [...claimSources.entries()].map(([claim, domains]): EvidenceGraphClaim => ({
    claim,
    sourceCount: domains.size,
    sourceDomains: [...domains].slice(0, 10),
    supported: domains.size >= 2 && claimAuthority.has(claim),
    authorityPresent: claimAuthority.has(claim),
  }));
  const positive = claims.find((c) => c.claim === "service_available")?.sourceCount ?? 0;
  const negative = claims.find((c) => c.claim === "service_unavailable")?.sourceCount ?? 0;
  const hire = claims.find((c) => c.claim === "hiring")?.sourceCount ?? 0;
  const noHire = claims.find((c) => c.claim === "not_hiring")?.sourceCount ?? 0;
  const contradictions = [
    ...(positive && negative ? ["Conflicting published intake-availability claims; confirm effective dates directly"] : []),
    ...(hire && noHire ? ["Conflicting public hiring status; confirm with employer"] : []),
  ];
  const numberOfPublishers = publishers.size;
  const governmentSources = [...publishers.values()].filter((p) => p.type === "government").length;
  const institutionalSources = [...publishers.values()].filter((p) => p.type === "institution").length;
  const communitySources = [...publishers.values()].filter((p) => p.type === "community").length;
  const supportedCount = claims.filter((c) => c.supported).length;
  const posture: LeadEvidenceGraph["posture"] = contradictions.length ? "conflicting" :
    numberOfPublishers === 0 ? "no_evidence" :
    numberOfPublishers >= 2 && supportedCount > 0 ? "corroborated" : "single_source";
  const dates = lead.evidence.map((item) => item.capturedAt).filter((x) => Number.isFinite(Date.parse(x))).sort();
  return {
    publishers: numberOfPublishers,
    firstPartySources: institutionalSources,
    governmentSources,
    institutionalSources,
    communitySources,
    claims,
    contradictions,
    posture,
    observedAt: dates.at(-1) ?? null,
    explanation: posture === "conflicting"
      ? "Public sources disagree. Resolve before qualification or outreach."
      : posture === "corroborated"
      ? supportedCount + " claim(s) confirmed by multiple independent publishers."
      : "Insufficient independent confirmation. This is a research candidate, not a verified opportunity.",
  };
}
