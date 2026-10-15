import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";

// Catches broken workspace links, lost Scout deep links, task persistence,
// inaccessible mobile navigation, and layout overflow at narrow viewports.
const base = process.env.CLEARSTEPS_UI_URL ?? "http://localhost:3000";
const output = process.env.EVIDENCE_DIR ?? "e2e-evidence";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
async function noOverflow(page: Page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "page must fit viewport");
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    if (!localStorage.getItem("design-test-seeded")) {
      localStorage.setItem("clearsteps.tasks.v1", JSON.stringify([{ id: "design-task", title: "Follow up with referral partner", description: "Confirm next steps", status: "open", priority: "normal", dueAt: "2020-01-01T12:00:00.000Z", createdAt: "2020-01-01T12:00:00.000Z", updatedAt: "2020-01-01T12:00:00.000Z" }]));
      localStorage.setItem("design-test-seeded", "true");
    }
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.getByRole("navigation", { name: "Workspaces", exact: true }).waitFor({ timeout: 15000 });
  await page.getByText("1 item needs your attention", { exact: true }).waitFor();
  // Measured from Puma Current.dc.html at 1440px, independent of app styles.
  assert.equal((await page.locator(".workspaceRail").boundingBox())?.width, 236);
  assert.equal((await page.locator(".workspaceTopbar").boundingBox())?.height, 56);
  assert.equal((await page.locator(".referenceWorkspaces").boundingBox())?.x, 386);
  assert.equal((await page.locator(".referenceWorkspaces").boundingBox())?.width, 904);
  assert.equal(await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(11, 11, 12)");
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
  await noOverflow(page);
  await page.screenshot({ path: `${output}/home-desktop.png`, fullPage: true, caret: "initial" });
  await page.getByRole("navigation", { name: "Workspaces", exact: true }).getByRole("link", { name: /Leads/ }).click();
  await page.waitForURL("**/leads");
  await page.getByRole("heading", { name: "Leads", exact: true }).waitFor();
  await page.screenshot({ path: `${output}/leads-desktop.png`, fullPage: true, caret: "initial" });
  await page.getByLabel("City or county", { exact: true }).fill("Denver");
  await page.getByRole("button", { name: "CO", exact: true }).click();
  await page.getByRole("button", { name: "Find leads", exact: true }).click();
  await page.waitForURL(/\/scout\?/);
  assert.equal(new URL(page.url()).searchParams.get("state"), "CO");
  assert.equal(new URL(page.url()).searchParams.get("location"), "Denver");
  await page.goto(`${base}/?state=KS&engine=rbt&location=Wichita`);
  await page.waitForURL(/\/scout\?/);
  assert.equal(new URL(page.url()).searchParams.get("engine"), "rbt");
  await page.goto(`${base}/today`);
  await page.getByRole("button", { name: "Complete Follow up with referral partner", exact: true }).waitFor();
  await page.screenshot({ path: `${output}/today-desktop.png`, fullPage: true, caret: "initial" });
  await page.getByRole("button", { name: "Complete Follow up with referral partner", exact: true }).click();
  await page.reload();
  assert.equal(await page.getByRole("button", { name: "Complete Follow up with referral partner", exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("clearsteps.tasks.v1")!)[0].status), "done");
  await page.goto(`${base}/crm`);
  await page.getByRole("heading", { name: "CRM", exact: true }).waitFor();
  await page.screenshot({ path: `${output}/crm-desktop.png`, fullPage: true, caret: "initial" });
  await page.locator(".workspaceRail").getByRole("link", { name: "Organizations", exact: true }).click();
  await page.waitForURL("**/organizations");
  await page.goto(base);
  await page.getByRole("button", { name: "Search your workspace" }).click();
  const search = page.getByRole("dialog", { name: "Search workspace" });
  await search.getByRole("searchbox").fill("tasks");
  await search.getByRole("link", { name: "Tasks", exact: true }).click();
  await page.waitForURL("**/tasks");
  // App Router updates the URL before the streamed page and effects commit.
  await page.getByRole("heading", { name: "Tasks", exact: true }).waitFor();
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  await search.waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("button", { name: "Search your workspace" }).evaluate((el) => el === document.activeElement), true);
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/", "/leads", "/crm", "/today"]) {
      await page.goto(`${base}${route}`);
      await page.locator(".referencePage").waitFor();
      await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
      await noOverflow(page);
      await page.screenshot({ path: `${output}/${route.slice(1) || "home"}-${width}.png`, fullPage: true, caret: "initial" });
    }
    await page.getByRole("button", { name: "Open navigation" }).click();
    const menu = page.getByRole("dialog", { name: "Workspace navigation" });
    await menu.getByRole("link", { name: "Leads", exact: true }).click();
    await page.waitForURL("**/leads");
    assert.equal(await menu.count(), 0);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button", { name: "Open navigation" }).evaluate((el) => el === document.activeElement), true);
  }
  // The current product is English. Logical spacing must still survive RTL.
  await page.evaluate(() => { document.documentElement.dir = "rtl"; });
  await noOverflow(page);
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });
  assert.deepEqual(errors, [], "no browser runtime errors");
  console.log("Workspace navigation, Scout scope, persistent tasks, search, mobile focus, and responsive layouts passed.");
} finally {
  await browser.close();
}
