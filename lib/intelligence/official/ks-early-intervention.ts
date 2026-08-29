import type { IndicatorObservation } from "../phase3/indicator-catalog";
import type { PublicSearchHit } from "../source-types";

export const KANSAS_EARLY_INTERVENTION_SOURCE_ID = "ks-kdhe-tiny-k-reports";
export const KANSAS_EARLY_INTERVENTION_SOURCE_URL = "https://www.kdhe.ks.gov/714/Semi-Annual-Report-Data-Sheets";
const KANSAS_BASE_URL = "https://www.kdhe.ks.gov";

export interface KansasEarlyInterventionProgram {
  id: string;
  name: string;
  sourceId: typeof KANSAS_EARLY_INTERVENTION_SOURCE_ID;
  sourceUrl: string;
}

export async function searchKansasEarlyIntervention(
  location: string,
  fetchImpl: typeof fetch = fetch,
): Promise<KansasEarlyInterventionProgram[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetchImpl(KANSAS_EARLY_INTERVENTION_SOURCE_URL, {
      signal: controller.signal,
      headers: { "user-agent": "ClearStepsResearch/1.0 (+public Kansas KDHE roster)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Kansas KDHE early-intervention roster returned ${response.status}`);
    const html = await response.text();
    return filterKansasEarlyInterventionPrograms(parseKansasEarlyInterventionPrograms(html), location);
  } finally {
    clearTimeout(timer);
  }
}

export function parseKansasEarlyInterventionPrograms(html: string): KansasEarlyInterventionProgram[] {
  const programs: KansasEarlyInterventionProgram[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[1]).trim();
    if (!/\/DocumentCenter\/View\//i.test(href)) continue;

    const text = cleanText(match[2]);
    const programMatch = text.match(/^(KS\d{2})\s+(.+?)(?:\s*\(PDF\))?$/i);
    if (!programMatch) continue;

    const id = programMatch[1].toUpperCase();
    if (seen.has(id)) continue;
    seen.add(id);

    let sourceUrl: string;
    try {
      sourceUrl = new URL(href, KANSAS_BASE_URL).toString();
    } catch {
      continue;
    }

    programs.push({
      id,
      name: programMatch[2].replace(/\s*\(PDF\)$/i, "").trim(),
      sourceId: KANSAS_EARLY_INTERVENTION_SOURCE_ID,
      sourceUrl,
    });
  }

  return programs;
}

export function filterKansasEarlyInterventionPrograms(
  programs: readonly KansasEarlyInterventionProgram[],
  location: string,
): KansasEarlyInterventionProgram[] {
  const normalized = location.trim().toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ");
  if (!normalized || normalized === "kansas" || normalized === "ks") return [...programs];

  const countyMatch = normalized.match(/\b([a-z][a-z '-]*?)\s+county\b/);
  if (!countyMatch) return [];
  const countyNeedle = `${countyMatch[1].trim()} county`;
  return programs.filter((program) => program.name.toLowerCase().includes(countyNeedle));
}

export function kansasEarlyInterventionToSearchHits(
  programs: readonly KansasEarlyInterventionProgram[],
  location: string,
): PublicSearchHit[] {
  return programs.map((program, index) => ({
    title: program.name,
    url: program.sourceUrl,
    snippet: `Official Kansas KDHE early-intervention program listed in the current Semi-Annual Report Data Sheets for ${location || "Kansas"}.`,
    query: `KDHE tiny-k early intervention ${location || "Kansas"}`,
    sourceId: KANSAS_EARLY_INTERVENTION_SOURCE_ID,
    rank: index + 1,
  }));
}

export function buildKansasEarlyInterventionObservations(
  programs: readonly KansasEarlyInterventionProgram[],
  under18Population: number,
): IndicatorObservation[] {
  if (programs.length === 0 || under18Population <= 0) return [];
  const programsPer100kChildren = (programs.length / under18Population) * 100_000;
  const value = Math.max(0, Math.min(100, Math.round((programsPer100kChildren / 4) * 100)));
  return [{
    indicatorId: "referral-ecosystem.09",
    value,
    confidence: 90,
    sourceIds: [KANSAS_EARLY_INTERVENTION_SOURCE_ID],
    capturedAt: new Date().toISOString(),
  }];
}

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—");
}
