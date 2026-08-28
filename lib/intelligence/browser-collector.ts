import { validatePublicHttpUrl } from "./network-safety";
import { robotsAllows } from "./robots";
import type { EnrichedWebsite } from "./source-types";

type BrowserModule = {
  chromium: {
    launch(options?: { headless?: boolean }): Promise<{
      newPage(options?: { userAgent?: string }): Promise<{
        goto(url: string, options?: { waitUntil?: "domcontentloaded" | "networkidle"; timeout?: number }): Promise<unknown>;
        title(): Promise<string>;
        locator(selector: string): { innerText(options?: { timeout?: number }): Promise<string> };
        content(): Promise<string>;
        url(): string;
        close(): Promise<void>;
      }>;
      close(): Promise<void>;
    }>;
  };
};

async function loadPlaywright(): Promise<BrowserModule | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<BrowserModule>;
    return await dynamicImport("playwright");
  } catch {
    return null;
  }
}

export async function playwrightAvailable() {
  return Boolean(await loadPlaywright());
}

export async function collectPublicPageWithPlaywright(url: string): Promise<EnrichedWebsite> {
  const safeUrl = await validatePublicHttpUrl(url);
  if (!safeUrl || !(await robotsAllows(safeUrl))) throw new Error("Public crawl policy blocked this URL.");
  const playwright = await loadPlaywright();
  if (!playwright) {
    throw new Error("Playwright runtime is not installed. Fetch-based collectors remain available.");
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: "ClearStepsResearch/1.0 (+public-data; contact=internal)",
    });
    await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const [title, bodyText] = await Promise.all([
      page.title(),
      page.locator("body").innerText({ timeout: 5_000 }).catch(() => ""),
    ]);
    const html = await page.content();
    return {
      url: safeUrl,
      finalUrl: page.url(),
      title,
      emails: extractEmails(`${bodyText}\n${html}`),
      phones: extractPhones(bodyText),
      textSample: bodyText.replace(/\s+/g, " ").slice(0, 5_000),
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

function extractEmails(value: string) {
  return Array.from(
    new Set((value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((item) => item.toLowerCase())),
  ).slice(0, 10);
}

function extractPhones(value: string) {
  return Array.from(
    new Set(
      (value.match(/(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}/g) ?? [])
        .map((item) => item.replace(/\s+/g, " ").trim()),
    ),
  ).slice(0, 10);
}
