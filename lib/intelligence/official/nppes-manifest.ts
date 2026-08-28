const MANIFEST_URL = "https://download.cms.gov/nppes/NPI_Files.html";
const CACHE_MS = 6 * 60 * 60 * 1000;

export interface NppesDownloadFile {
  label: string;
  url: string;
  kind: "monthly" | "weekly" | "deactivation" | "reference";
}

export interface NppesDownloadManifest {
  sourceUrl: string;
  fetchedAt: string;
  monthly?: NppesDownloadFile;
  weekly: NppesDownloadFile[];
  deactivation?: NppesDownloadFile;
  files: NppesDownloadFile[];
}

let cache: { expiresAt: number; value: NppesDownloadManifest } | undefined;

export async function getNppesDownloadManifest(): Promise<NppesDownloadManifest> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(MANIFEST_URL, {
      signal: controller.signal,
      headers: { "user-agent": "ClearStepsResearch/1.0 (+public CMS provider data)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`CMS NPPES manifest returned ${response.status}`);
    const html = await response.text();
    const files = parseNppesDownloadLinks(html);
    const monthly = files.find((file) => file.kind === "monthly");
    const weekly = files.filter((file) => file.kind === "weekly");
    const deactivation = files.find((file) => file.kind === "deactivation");
    const value = { sourceUrl: MANIFEST_URL, fetchedAt: new Date().toISOString(), monthly, weekly, deactivation, files };
    cache = { expiresAt: Date.now() + CACHE_MS, value };
    return value;
  } finally {
    clearTimeout(timer);
  }
}

export function parseNppesDownloadLinks(html: string): NppesDownloadFile[] {
  const files: NppesDownloadFile[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    const href = match[1].trim();
    if (!/\.zip(?:$|\?)/i.test(href)) continue;
    const label = decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim();
    const url = new URL(href, MANIFEST_URL).toString();
    const context = `${label} ${href}`.toLowerCase();
    let kind: NppesDownloadFile["kind"] = "reference";
    if (context.includes("weekly") || /\d{6}_\d{6}/.test(context)) kind = "weekly";
    else if (context.includes("deactivation")) kind = "deactivation";
    else if (context.includes("dissemination") || context.includes("monthly") || context.includes("nppes_data")) kind = "monthly";
    files.push({ label: label || href.split("/").pop() || "NPPES download", url, kind });
  }
  return dedupe(files);
}

function dedupe(files: NppesDownloadFile[]) {
  return Array.from(new Map(files.map((file) => [file.url, file])).values());
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
