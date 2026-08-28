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

console.log("Clear Steps Playwright Chromium + Phase 2 UI smoke passed.");

async function verifyClearStepsUi(baseUrl: string) {
  await verifyDesktopCrm(baseUrl);
  await verifyMobilePwa(baseUrl);
}

async function verifyDesktopCrm(baseUrl: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    const lead = {
      id: "browser-referral-1",
      name: "Browser Test Pediatrics",
      pipeline: "referral",
      stage: "Qualified",
      kind: "organization",
      score: 88,
      confidence: 92,
      location: "Lakewood, NJ",
      domain: "browser-test.example",
      website: "https://example.com",
      reasons: ["Public pediatric referral signal"],
      unknowns: ["Confirm referral workflow"],
      emails: ["referrals@example.com"],
      phones: ["+1 555 0100"],
      evidence: [{
        id: "browser-evidence-1",
        sourceId: "public_web",
        title: "Browser Test Pediatrics public page",
        url: "https://example.com",
        snippet: "Public pediatric practice information",
        query: "browser acceptance",
        capturedAt: "2026-08-28T12:00:00.000Z",
        purpose: "discover",
      }],
      signals: ["pediatric referral"],
      savedAt: "2026-08-28T12:00:00.000Z",
      updatedAt: "2026-08-28T12:00:00.000Z",
    };
    window.localStorage.setItem("clearsteps.crm.leads.v1", JSON.stringify([lead]));
  });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/pipeline`, { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Referral CRM desktop");
    await assertActiveNavigation(page, "Referral CRM");

    const rail = page.locator(".workspaceRail");
    assert.equal(await rail.count(), 1, "desktop CRM should expose one persistent workspace rail");
    const railBox = await rail.boundingBox();
    assert.ok(railBox && railBox.width >= 220, "desktop workspace rail should retain operator-console width");

    const brandImage = page.locator('.brandLockup img[src*="brand-mark"]');
    assert.equal(await brandImage.count(), 1, "workspace should render the Navi-derived Clear Steps brand mark");

    const seededRecord = page.getByText("Browser Test Pediatrics", { exact: true }).first();
    await seededRecord.waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(await seededRecord.innerText(), "Browser Test Pediatrics", "seeded CRM record should render after hydration");
    await assertVisibleKeyboardFocus(page, page.getByPlaceholder("Search name, stage, location, contact…"), "CRM search");

    await page.getByPlaceholder("Search name, stage, location, contact…").fill("pediatrics");
    assert.equal(await page.getByText("1 shown", { exact: true }).innerText(), "1 shown");
    await page.getByPlaceholder("Search name, stage, location, contact…").fill("missing record");
    assert.equal(await page.getByText("0 shown", { exact: true }).innerText(), "0 shown");
    await page.getByPlaceholder("Search name, stage, location, contact…").fill("");

    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.locator(".crmTable").waitFor({ state: "visible" });
    assert.equal(await page.locator(".crmTable").count(), 1, "List view should render the dense CRM table");
    await page.getByRole("button", { name: "Board", exact: true }).click();

    await page.getByRole("button", { name: "Open Browser Test Pediatrics details" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    assert.equal(await page.getByRole("dialog").count(), 1, "CRM record should open a detail drawer");
    assert.equal(await page.getByRole("heading", { name: "Browser Test Pediatrics" }).innerText(), "Browser Test Pediatrics");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await page.getByRole("dialog").count(), 0, "Escape should close the CRM detail drawer");
  } finally {
    await context.close();
  }
}

async function verifyMobilePwa(baseUrl: string) {
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
  const activeNav = page.locator('nav[aria-label="Clear Steps workspace"] a[aria-current="page"]');
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
    `${label} should reflow without body-level horizontal scrolling`,
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
