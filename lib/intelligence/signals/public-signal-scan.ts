import type { IndicatorObservation } from "../phase3/indicator-catalog";
import type { PublicSearchHit } from "../source-types";
import { PUBLIC_SIGNAL_RULES, CROSS_SOURCE_CHECKS } from "./extended-catalog";

export interface PublicSignalClue {
  indicatorId: string;
  name: string;
  group: string;
  corroborated: boolean;
  sourceCount: number;
  evidenceTypes: string[];
  /** Sources are domains only; never provide direct links to family posts. */
  sourceDomains: string[];
  geographySupported: boolean;
}

export interface PublicSignalCrossCheck {
  id: string;
  title: string;
  status: "supported" | "partial" | "unobserved";
  sourceCount: number;
}

export interface PublicSignalScan {
  inspected: number;
  clues: PublicSignalClue[];
  observations: IndicatorObservation[];
  crossChecks: PublicSignalCrossCheck[];
  supportedChecks: number;
}

type Candidate = { text: string; host: string; sourceClass: "official" | "organization" | "press" | "community" | "other" };
const INSTITUTIONAL_HOSTS = /\.(gov|edu)$/i;
const COMMUNITY_DOMAINS = ["reddit.com", "facebook.com", "threads.net", "nextdoor.com", "quora.com", "tiktok.com", "instagram.com", "x.com"];
const PRESS_TERMS = /news|journal|gazette|post|times|tribune|daily|press|report|radio|publicmedia/i;
const PRIVATE_HOUSEHOLD_TERMS = [
  /\b(child|kid|son|daughter|boy|girl)\b.{0,90}\b(lives here|lives at|our house|my house|home address)\b/i,
  /\b(lives here|lives at|our house|my house|home address)\b.{0,90}\b(autis|disab|special needs)\b/i,
  /\b(?:\d{1,5}\s+[a-z0-9 .'-]+\s+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr))\b/i,
];

function hostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function classify(host: string): Candidate["sourceClass"] {
  if (COMMUNITY_DOMAINS.some((domain) => host === domain || host.endsWith("." + domain))) return "community";
  if (INSTITUTIONAL_HOSTS.test(host)) return "official";
  if (PRESS_TERMS.test(host)) return "press";
  if (host.endsWith(".org") || host.endsWith(".health")) return "organization";
  return "other";
}

function createCandidate(hit: PublicSearchHit): Candidate | null {
  const host = hostname(hit.url);
  if (!host) return null;
  const text = (hit.title + " " + hit.snippet).slice(0, 2400);
  // A public sign near a particular child's home must never become a geocoded lead.
  if (PRIVATE_HOUSEHOLD_TERMS.some((term) => term.test(text))) return null;
  return { text: text.toLowerCase(), host, sourceClass: classify(host) };
}

/** Search query terms never count as geography evidence. Require published place text. */
export function matchesPublicTerritory(text: string, targetLocation: string): boolean {
  const cleaned = targetLocation.trim().replace(/,\s*(missouri|kansas|colorado|mo|ks|co)$/i, "").trim();
  if (!cleaned || /^statewide$/i.test(cleaned)) return true;
  const postal = cleaned.match(/\b\d{5}\b/)?.[0];
  if (postal) return new RegExp("\\b" + postal + "\\b").test(text);
  const target = cleaned.replace(/\bcounty\b/gi, "").trim();
  if (!target) return true;
  const names: Record<string,string> = {MO:"Missouri",KS:"Kansas",CO:"Colorado"};
  const region = names[target.toUpperCase()] ?? target;
  const words = region.split(/\s+/).map((word) => word.replace(/[^a-z0-9]/gi, "")).filter(Boolean);
  if (!words.length) return false;
  return new RegExp("\\b" + words.join("\\s+") + "\\b", "i").test(text);
}

/** Pure, deterministic, bounded cross-reference stage. Uncorroborated signals never raise a score. */
export function scanPublicSignals(hits: readonly PublicSearchHit[], capturedAt = new Date().toISOString(), targetLocation = ""): PublicSignalScan {
  const candidates = hits.slice(0, 250).map(createCandidate).filter((item): item is Candidate => Boolean(item));
  const clues: PublicSignalClue[] = [];
  const observations: IndicatorObservation[] = [];
  const hostsByIndicator = new Map<string, Set<string>>();

  for (const rule of PUBLIC_SIGNAL_RULES) {
    const matched = candidates.filter((item) => rule.keywords.every((keyword) => item.text.includes(keyword)));
    if (!matched.length) continue;
    // Multiple search hits from a single website are one source, not corroboration.
    const hosts = new Map(matched.map((item) => [item.host, item]));
    const independent = [...hosts.values()];
    const localized = independent.filter((item) => matchesPublicTerritory(item.text, targetLocation));
    const sourceTypes = [...new Set(independent.map((item) => item.sourceClass))];
    const institutional = localized.some((item) => item.sourceClass !== "community" && item.sourceClass !== "other");
    const corroborated = rule.community
      ? localized.length >= 3 && institutional
      : localized.length >= 2 && institutional;
    const hostSet = new Set(independent.map((item) => item.host));
    hostsByIndicator.set(rule.id, hostSet);

    clues.push({
      indicatorId: rule.id,
      name: rule.name,
      group: rule.group,
      corroborated,
      sourceCount: independent.length,
      evidenceTypes: sourceTypes,
      sourceDomains: [...hostSet].slice(0, 8),
      geographySupported: localized.length >= 2,
    });

    if (corroborated) {
      const official = localized.some((item) => item.sourceClass === "official");
      const confidence = Math.min(86, 48 + 7 * localized.length + (official ? 9 : 0));
      observations.push({
        indicatorId: rule.id,
        value: Math.min(85, 50 + 7 * localized.length),
        confidence,
        sourceIds: localized.map((item) => item.host).slice(0, 8),
        capturedAt,
      });
    }
  }

  const verifiedIndicators = new Set(observations.map((item) => item.indicatorId));
  const crossChecks: PublicSignalCrossCheck[] = CROSS_SOURCE_CHECKS.map((check) => {
    const left = hostsByIndicator.get(check.left) ?? new Set<string>();
    const right = hostsByIndicator.get(check.right) ?? new Set<string>();
    const union = new Set([...left, ...right]);
    // Distinct organizations must corroborate *both* categories before a pass.
    const supported = verifiedIndicators.has(check.left) && verifiedIndicators.has(check.right)
      && union.size >= 3 && [...left].some((host) => !right.has(host));
    return {
      id: check.id,
      title: check.title,
      status: supported ? "supported" : left.size || right.size ? "partial" : "unobserved",
      sourceCount: union.size,
    };
  });

  return {
    inspected: candidates.length,
    clues: clues.sort((a, b) => Number(b.corroborated) - Number(a.corroborated) || b.sourceCount - a.sourceCount).slice(0, 60),
    observations,
    crossChecks,
    supportedChecks: crossChecks.filter((item) => item.status === "supported").length,
  };
}
