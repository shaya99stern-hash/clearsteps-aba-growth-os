import type { PublicSearchHit } from "../source-types";

const DATASET_URL = "https://data.nj.gov/api/views/cru5-4rmm/rows.csv?accessType=DOWNLOAD";
const DATASET_PAGE = "https://data.nj.gov/d/cru5-4rmm";
const CACHE_MS = 30 * 60 * 1000;

type Row = Record<string, string>;
let cache: { expiresAt: number; rows: Row[] } | undefined;

export async function searchNjChildCare(location: string, limit = 20): Promise<PublicSearchHit[]> {
  const rows = await loadRows();
  const target = normalize(location);
  const zip = location.match(/\b\d{5}\b/)?.[0];
  const county = location.match(/([A-Za-z .'-]+)\s+County/i)?.[1]?.trim().toLowerCase();
  const locality = location
    .replace(/\b(New Jersey|NJ)\b/gi, "")
    .replace(/\b\d{5}\b/g, "")
    .replace(/county/gi, "")
    .replace(/[,]+/g, " ")
    .trim()
    .toLowerCase();

  return rows
    .map((row) => ({ row, score: matchScore(row, { target, zip, county, locality }) }))
    .filter((item) => item.score > 0 || isStatewideTarget(target))
    .sort((a, b) => b.score - a.score || value(a.row, "center").localeCompare(value(b.row, "center")))
    .slice(0, Math.max(1, Math.min(limit, 50)))
    .map(({ row }, index) => toSearchHit(row, location, index));
}

async function loadRows() {
  if (cache && cache.expiresAt > Date.now()) return cache.rows;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(DATASET_URL, {
      signal: controller.signal,
      headers: { "user-agent": "ClearStepsResearch/1.0 (+public licensed child-care data)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`NJ child-care download returned ${response.status}`);
    const text = await response.text();
    if (text.length > 12_000_000) throw new Error("NJ child-care download exceeded safety limit");
    const parsed = csvToRows(text);
    cache = { expiresAt: Date.now() + CACHE_MS, rows: parsed };
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

function toSearchHit(row: Row, location: string, index: number): PublicSearchHit {
  const center = value(row, "center") || "Licensed child care center";
  const city = value(row, "city");
  const zip = value(row, "zip");
  const address = [value(row, "addr1"), value(row, "addr2"), city, "NJ", zip].filter(Boolean).join(", ");
  const ages = value(row, "ages");
  const capacity = value(row, "capacity");
  const phone = value(row, "phone");
  const inspectionUrl = firstUrl(value(row, "inspections")) ?? DATASET_PAGE;
  const details = [
    "Official New Jersey licensed child-care center.",
    address ? `Address: ${address}.` : "",
    ages ? `Ages: ${ages}.` : "",
    capacity ? `Licensed capacity: ${capacity}.` : "",
    phone ? `Phone: ${phone}.` : "",
  ].filter(Boolean).join(" ");

  return {
    title: center,
    url: inspectionUrl,
    snippet: details,
    query: `NJ licensed child-care centers near ${location || "New Jersey"}`,
    sourceId: "nj-childcare-download",
    rank: index + 1,
  };
}

function matchScore(row: Row, target: { target: string; zip?: string; county?: string; locality: string }) {
  const city = value(row, "city").toLowerCase();
  const county = value(row, "county").toLowerCase();
  const zip = value(row, "zip");
  let score = 0;
  if (target.zip && zip === target.zip) score += 100;
  if (target.county && county === target.county) score += 90;
  if (target.locality && city === target.locality) score += 85;
  if (target.locality && city.includes(target.locality)) score += 55;
  if (target.locality && county.includes(target.locality)) score += 45;
  if (target.target.includes(city) && city.length >= 3) score += 35;
  return score;
}

function isStatewideTarget(target: string) {
  return target === "nj" || target === "new jersey" || target === "nj new jersey" || target === "new jersey nj";
}

function value(row: Row, key: string) {
  return row[key] ?? row[key.toUpperCase()] ?? "";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function firstUrl(value: string) {
  return value.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
}

function csvToRows(input: string): Row[] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); records.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); records.push(row); }
  const headers = (records.shift() ?? []).map((header) => header.trim().toLowerCase());
  return records
    .filter((record) => record.some(Boolean))
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index]?.trim() ?? ""])));
}
