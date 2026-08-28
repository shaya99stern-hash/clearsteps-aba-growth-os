import { access } from "node:fs/promises";
import { validatePublicHttpUrl } from "./network-safety";
import { robotsAllows } from "./robots";
import type { EnrichedWebsite } from "./source-types";

type BrowserRoute = {
  request(): { url(): string };
  continue(): Promise<void>;
  abort(errorCode?: string): Promise<void>;
};

type BrowserPage = {
  goto(url: string, options?: { waitUntil?: "domcontentloaded" | "networkidle"; timeout?: number }): Promise<unknown>;
  title(): Promise<string>;
  locator(selector: string): { innerText(options?: { timeout?: number }): Promise<string> };
  content(): Promise<string>;
  url(): string;
  route(url: string, handler: (route: BrowserRoute) => Promise<void>): Promise<void>;
};

type BrowserModule = {
  chromium: {
    executablePath(): string;
    launch(options?: { headless?: boolean }): Promise<{
      newPage(options?: { userAgent?: string }): Promise<BrowserPage>;
      close(): Promise<void>;
    }>;
  };
};

export interface PlaywrightRuntimeStatus {
  packageAvailable: boolean;
  browserAvailable: boolean;
  executablePath?: string;
}

async function loadPlaywright(): Promise<BrowserModule | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<BrowserModule>;
    return await dynamicImport("playwright");
  } catch {
    return null;
  }
}

export async function getPlaywrightRuntimeStatus(): Promise<PlaywrightRuntimeStatus> {
  const playwright = await loadPlaywright();
  if (!playwright) return { packageAvailable: false, browserAvailable: false };
  const executablePath = playwright.chromium.executablePath();
  try {
    await access(executablePath);
    return { packageAvailable: true, browserAvailable: true, executablePath };
  } catch {
    return { packageAvailable: true, browserAvailable: false, executablePath };
  }
}

export async function playwrightAvailable() {
  return (await getPlaywrightRuntimeStatus()).browserAvailable;
}

export async function collectPublicPageWithPlaywright(url: string): Promise<EnrichedWebsite> {
  const safeUrl = await validatePublicHttpUrl(url);
  if (!safeUrl || !(await robotsAllows(safeUrl))) throw new Error("Public crawl policy blocked this URL.");
  const playwright = await loadPlaywright();
  const runtime = await getPlaywrightRuntimeStatus();
  if (!playwright || !runtime.browserAvailable) {
    throw new Error("Playwright browser is not installed. Fetch-based collectors remain available; run the browser install step on a browser-worker runtime.");
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: "ClearStepsResearch/1.0 (+public-data; contact=internal)",
    });
    const publicHosts = new Map<string, boolean>();
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      if (!/^https?:/i.test(requestUrl)) {
        await route.continue();
        return;
      }
      let host: string;
      try {
        host = new URL(requestUrl).hostname.toLowerCase();
      } catch {
        await route.abort("blockedbyclient");
        return;
      }
      let allowed = publicHosts.get(host);
      if (allowed === undefined) {
        allowed = Boolean(await validatePublicHttpUrl(requestUrl));
        publicHosts.set(host, allowed);
      }
      if (!allowed) {
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });

    await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const finalUrl = await validatePublicHttpUrl(page.url());
    if (!finalUrl) throw new Error("Browser navigation ended on a blocked network target.");

    const [title, bodyText] = await Promise.all([
      page.title(),
      page.locator("body").innerText({ timeout: 5_000 }).catch(() => ""),
    ]);
    const html = await page.content();
    return {
      url: safeUrl,
      finalUrl,
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
