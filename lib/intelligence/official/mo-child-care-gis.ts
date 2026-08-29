import type { IndicatorObservation } from "../phase3/indicator-catalog";
import type { PublicSearchHit } from "../source-types";

export const MISSOURI_CHILD_CARE_SOURCE_ID = "mo-dhss-child-care-gis";
export const MISSOURI_CHILD_CARE_LAYER_URL = "https://gis.mo.gov/arcgis/rest/services/DHSS/Child_care/MapServer/0";
const QUERY_URL = `${MISSOURI_CHILD_CARE_LAYER_URL}/query`;
const OUT_FIELDS = [
  "OBJECTID",
  "SITE_TYPE",
  "STATUS",
  "FACILITY",
  "DVN",
  "ADDRESS",
  "CITY",
  "STATE",
  "ZIP",
  "COUNTY",
  "PHONE",
  "MIN_AGE",
  "MAX_AGE",
  "TOTAL",
  "LATITUDE",
  "LONGITUDE",
].join(",");

export interface MissouriChildCareProvider {
  id: string;
  name: string;
  licenseId?: string;
  siteType?: string;
  status?: string;
  address?: string;
  city?: string;
  state: "MO";
  zip?: string;
  county?: string;
  phone?: string;
  minAge?: string;
  maxAge?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  sourceId: typeof MISSOURI_CHILD_CARE_SOURCE_ID;
  sourceUrl: typeof MISSOURI_CHILD_CARE_LAYER_URL;
}

export async function searchMissouriChildCare(
  location: string,
  limit = 120,
): Promise<MissouriChildCareProvider[]> {
  const params = new URLSearchParams({
    f: "json",
    where: buildWhereClause(location),
    outFields: OUT_FIELDS,
    returnGeometry: "false",
    orderByFields: "FACILITY ASC",
    resultRecordCount: String(Math.max(1, Math.min(200, limit))),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(`${QUERY_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { "user-agent": "ClearStepsResearch/1.0 (+public Missouri DHSS GIS)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Missouri DHSS child-care GIS returned ${response.status}`);
    const payload = await response.json() as unknown;
    if (hasArcGisError(payload)) throw new Error(`Missouri DHSS child-care GIS: ${payload.error.message || "query failed"}`);
    return parseMissouriChildCareFeatures(payload);
  } finally {
    clearTimeout(timer);
  }
}

export function parseMissouriChildCareFeatures(payload: unknown): MissouriChildCareProvider[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) return [];
  const providers = new Map<string, MissouriChildCareProvider>();

  for (const feature of payload.features) {
    if (!isRecord(feature) || !isRecord(feature.attributes)) continue;
    const a = feature.attributes;
    const name = text(a.FACILITY);
    const state = text(a.STATE).toUpperCase();
    const status = text(a.STATUS);
    if (!name || state !== "MO" || isInactive(status)) continue;

    const licenseId = text(a.DVN) || undefined;
    const objectId = text(a.OBJECTID);
    const id = licenseId || objectId || slug(`${name}-${text(a.ADDRESS)}-${text(a.ZIP)}`);
    if (!id) continue;

    providers.set(id, {
      id,
      name,
      licenseId,
      siteType: text(a.SITE_TYPE) || undefined,
      status: status || undefined,
      address: text(a.ADDRESS) || undefined,
      city: titleCase(text(a.CITY)) || undefined,
      state: "MO",
      zip: text(a.ZIP) || undefined,
      county: titleCase(text(a.COUNTY)) || undefined,
      phone: text(a.PHONE) || undefined,
      minAge: text(a.MIN_AGE) || undefined,
      maxAge: text(a.MAX_AGE) || undefined,
      capacity: nonNegativeNumber(a.TOTAL),
      latitude: finiteNumber(a.LATITUDE),
      longitude: finiteNumber(a.LONGITUDE),
      sourceId: MISSOURI_CHILD_CARE_SOURCE_ID,
      sourceUrl: MISSOURI_CHILD_CARE_LAYER_URL,
    });
  }

  return [...providers.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildMissouriChildCareObservations(
  providers: readonly MissouriChildCareProvider[],
  under18Population: number,
): IndicatorObservation[] {
  const childPopulation = Number.isFinite(under18Population) && under18Population > 0 ? under18Population : 0;
  const per10kChildren = childPopulation > 0 ? providers.length / (childPopulation / 10_000) : 0;
  const densityScore = clamp(Math.round((per10kChildren / 20) * 100));
  return [{
    indicatorId: "referral-ecosystem.07",
    value: densityScore,
    confidence: 92,
    sourceIds: [MISSOURI_CHILD_CARE_SOURCE_ID],
    capturedAt: new Date().toISOString(),
  }];
}

export function missouriChildCareToSearchHits(
  providers: readonly MissouriChildCareProvider[],
  location: string,
): PublicSearchHit[] {
  return providers.map((provider, index) => ({
    title: provider.name,
    url: provider.sourceUrl,
    snippet: [
      "Official Missouri DHSS child-care facility",
      provider.siteType,
      provider.status,
      provider.city && provider.county ? `${provider.city}, ${provider.county} County` : provider.city || provider.county,
      provider.capacity !== undefined ? `capacity ${provider.capacity}` : undefined,
      provider.minAge || provider.maxAge ? `ages ${provider.minAge || "?"}-${provider.maxAge || "?"}` : undefined,
      provider.phone ? `public phone ${provider.phone}` : undefined,
    ].filter(Boolean).join(" · "),
    query: `Missouri DHSS child care ${location}`.trim(),
    sourceId: MISSOURI_CHILD_CARE_SOURCE_ID,
    rank: index + 1,
  }));
}

function buildWhereClause(location: string) {
  const base = "STATE = 'MO'";
  const zip = location.match(/\b\d{5}\b/)?.[0];
  if (zip) return `${base} AND ZIP LIKE '${escapeSql(zip)}%'`;

  const cleaned = location
    .replace(/\b(Missouri|MO)\b/gi, "")
    .replace(/[,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return base;

  if (/\bcounty\b/i.test(cleaned)) {
    const county = cleaned.replace(/\bcounty\b/gi, "").trim().toUpperCase();
    return `${base} AND UPPER(COUNTY) = '${escapeSql(county)}'`;
  }
  return `${base} AND UPPER(CITY) = '${escapeSql(cleaned.toUpperCase())}'`;
}

function isInactive(status: string) {
  return /\b(closed|inactive|revoked|expired|suspended|terminated)\b/i.test(status);
}

function hasArcGisError(value: unknown): value is { error: { message?: string } } {
  return isRecord(value) && isRecord(value.error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function nonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function titleCase(value: string) {
  if (!value) return "";
  return value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
