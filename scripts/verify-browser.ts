import assert from "node:assert/strict";
import { chromium } from "playwright";
import { getPlaywrightRuntimeStatus } from "../lib/intelligence/browser-collector";

const runtime = await getPlaywrightRuntimeStatus();
assert.equal(runtime.packageAvailable, true, "Playwright package should be installed");
assert.equal(runtime.browserAvailable, true, "Chromium executable should be installed for browser workers");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("data:text/html,<main><h1>Clear Steps browser ready</h1></main>");
  assert.equal(await page.locator("h1").innerText(), "Clear Steps browser ready");
} finally {
  await browser.close();
}

console.log("Clear Steps Playwright Chromium smoke passed.");
