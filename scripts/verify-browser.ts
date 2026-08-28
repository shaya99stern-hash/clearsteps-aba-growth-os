import assert from "node:assert/strict";
import { chromium, type Locator, type Page } from "playwright";
import { getPlaywrightRuntimeStatus } from "../lib/intelligence/browser-collector";

const runtime = await getPlaywrightRuntimeStatus();
assert.equal(runtime.packageAvailable, true, "Playwright package should be installed");
assert.equal(runtime.browserAvailable, true, "Chromium executable should be installed for browser workers");

const browser = await chromium.launch({ headless: true });
try {
  const smokePage = await browser.newPage();
  await smokePage.goto("data:text/html,<main><h1>Clear Steps browser ready</h1></main>");
  assert.equal(await smokePage.locator("h1").innerText(), "Clear Steps browser ready");
  await smokePage.close();

  const baseUrl = process.env.CLEARSTEPS_UI_URL;
  if (baseUrl) await verifyClearStepsUi(baseUrl);
} finally {
  await browser.close();
}

console.log("Clear Steps Playwright Chromium + UI accessibility smoke passed.");

async function verifyClearStepsUi(baseUrl: string) {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/outreach`, { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Outreach");

    await page.keyboard.press("Tab");
    const firstFocusText = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    assert.equal(firstFocusText, "Skip to main content", "the skip link should be the first keyboard focus target");
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id),
      "page-content",
      "activating the skip link should move focus to the main content landmark",
    );

    await assertActiveNavigation(page, "Outreach");
    await assertVisibleKeyboardFocus(page, page.getByLabel("Campaign name"), "Outreach campaign name");
    await assertVisibleKeyboardFocus(page, page.getByLabel("Suppress an email"), "Outreach suppression email");

    await page.goto(`${baseUrl}/tasks`, { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Tasks");
    await assertActiveNavigation(page, "Tasks");
    await assertVisibleKeyboardFocus(page, page.getByLabel("Task title"), "Task title");

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Scout");
    await assertActiveNavigation(page, "Scout");
    await assertVisibleKeyboardFocus(page, page.locator('textarea[aria-label="Research request"]'), "Scout research request");
    await assertVisibleKeyboardFocus(page, page.locator('input[aria-label="Target location"]'), "Scout target location");
  } finally {
    await context.close();
  }
}

async function assertActiveNavigation(page: Page, expected: string) {
  const activeNav = page.locator('nav[aria-label="Clear Steps navigation"] a[aria-current="page"]');
  assert.equal(await activeNav.count(), 1, "exactly one navigation item should expose aria-current=page");
  assert.equal((await activeNav.innerText()).trim(), expected);
}

async function assertNoBodyOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth,
    `${label} should reflow at 320px without body-level horizontal scrolling`,
  );
}

async function assertVisibleKeyboardFocus(_page: Page, locator: Locator, label: string) {
  await locator.focus();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  const hasOutline = focus.outlineStyle !== "none" && focus.outlineWidth !== "0px";
  const hasShadow = focus.boxShadow !== "none";
  assert.ok(hasOutline || hasShadow, `${label} must expose a visible keyboard focus indicator`);
}
