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

console.log("Clear Steps Playwright Chromium + Phase 4 UI acceptance passed.");

async function verifyClearStepsUi(baseUrl: string) {
  await verifyDesktopCrm(baseUrl);
  await verifyMobilePwa(baseUrl);
  await verifyClientGrowthOnIphone(baseUrl);
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
      location: "Kansas City, MO",
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

    const brandImage = page.locator('.brandLockup img[src*="app-icon"]');
    assert.equal(await brandImage.count(), 1, "workspace should render the ABA Engine app icon");

    const seededRecord = page.getByText("Browser Test Pediatrics", { exact: true }).first();
    await seededRecord.waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(await seededRecord.innerText(), "Browser Test Pediatrics", "seeded CRM record should render after hydration");
    await assertVisibleKeyboardFocus(
      page,
      page.getByPlaceholder("Search name, stage, location, contact…"),
      "CRM search",
      page.locator(".crmSearchField"),
    );

    await page.getByPlaceholder("Search name, stage, location, contact…").fill("pediatrics");
    assert.equal(await page.getByText("1 shown", { exact: true }).innerText(), "1 shown");
    await page.getByPlaceholder("Search name, stage, location, contact…").fill("missing record");
    assert.equal(await page.getByText("0 shown", { exact: true }).innerText(), "0 shown");
    await page.getByPlaceholder("Search name, stage, location, contact…").fill("");

    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.locator(".crmTable").waitFor({ state: "visible" });
    assert.equal(await page.locator(".crmTable").count(), 1, "List view should render the dense CRM table");
    await page.getByRole("button", { name: "Board", exact: true }).click();

    const opener = page.getByRole("button", { name: "Open Browser Test Pediatrics details" });
    await opener.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    assert.equal(await dialog.count(), 1, "CRM record should open a detail drawer");
    assert.equal(
      await dialog.getByRole("heading", { name: "Browser Test Pediatrics" }).innerText(),
      "Browser Test Pediatrics",
      "CRM drawer should expose the selected record heading",
    );
    assert.equal(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
      true,
      "opening a CRM drawer should move keyboard focus into the dialog",
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.equal(await page.getByRole("dialog").count(), 0, "Escape should close the CRM detail drawer");
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Open Browser Test Pediatrics details",
      undefined,
      { timeout: 1_500 },
    );
    assert.equal(await opener.evaluate((element) => element === document.activeElement), true, "closing the CRM drawer should restore focus to its trigger");
  } finally {
    await context.close();
  }
}

async function verifyMobilePwa(baseUrl: string) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    window.localStorage.setItem("clearsteps.scout.history.v1", JSON.stringify([{
      id: "browser-territory-1",
      capturedAt: new Date().toISOString(),
      state: "MO",
      engine: "client",
      location: "Kansas City, Missouri",
      query: "Find public pediatric referral organizations",
      score: 78,
      label: "High",
      confidence: 82,
      coverage: 45,
      reasoning: ["Public referral evidence from multiple sources"],
      screened: 28,
      qualified: 5,
      observedIndicators: 24,
      applicableIndicators: 60,
      completedSources: 3,
      sourceCount: 4,
      warnings: 0,
    }]));
  });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/outreach`, { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Outreach");
    await assertNativeMobileChrome(page, "More");

    await page.keyboard.press("Tab");
    const firstFocusText = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    assert.equal(firstFocusText, "Skip to main content", "the skip link should be the first keyboard focus target");
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id),
      "page-content",
      "activating the skip link should move focus to the main content landmark",
    );
    await assertVisibleKeyboardFocus(page, page.getByLabel("Campaign name"), "Outreach campaign name");
    await assertVisibleKeyboardFocus(page, page.getByLabel("Suppress an email"), "Outreach suppression email");

    await page.goto(`${baseUrl}/tasks`, { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Tasks");
    await assertNativeMobileChrome(page, "Tasks");
    await assertVisibleKeyboardFocus(page, page.getByLabel("Task title"), "Task title");

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Scout");
    await assertNativeMobileChrome(page, "Scout");

    const bodyText = await page.locator("body").innerText();
    assert.equal(/Lakewood|New Jersey|\bNJ\b/.test(bodyText), false, "Scout mobile should not expose the retired New Jersey default");

    const engineButtons = page.locator('[aria-label="Lead engine"] button');
    assert.equal(await engineButtons.count(), 3, "Scout should expose exactly Clients, RBTs, and BCBAs engines");
    assert.deepEqual(await engineButtons.allInnerTexts(), ["Clients", "RBTs", "BCBAs"]);
    assert.equal(await page.getByRole("button", { name: "Clients", exact: true }).getAttribute("aria-pressed"), "true");

    const ageFocus = page.getByLabel("Client age focus");
    assert.equal(await ageFocus.inputValue(), "2-18", "Client Scout must default to ages 2–18");
    await ageFocus.selectOption("6-11");
    assert.equal(await ageFocus.inputValue(), "6-11", "Operator can narrow research to school-age 6–11");
    await ageFocus.selectOption("12-18");
    assert.equal(await ageFocus.inputValue(), "12-18", "Adolescent 12–18 focus must work");
    await assertNoBodyOverflow(page, "Narrow youth cohorts");

    const stateButtons = page.locator('[aria-label="Target state"] button');
    assert.equal(await stateButtons.count(), 3, "Scout should expose Missouri, Kansas and Colorado state controls");
    assert.deepEqual(await stateButtons.allInnerTexts(), ["Missouri", "Kansas", "Colorado"]);
    assert.equal(await page.getByRole("button", { name: "Missouri", exact: true }).getAttribute("aria-pressed"), "true");

    const locationInput = page.getByLabel("Target city, ZIP, county or state");
    assert.equal(await locationInput.inputValue(), "Missouri", "Scout should default new research to Missouri");

    const composer = page.locator(".scoutComposerV3");
    const composerBox = await composer.boundingBox();
    assert.ok(composerBox && composerBox.y < 500, "Scout composer should appear in the first mobile viewport without scrolling through oversized chrome");

    await assertVisibleKeyboardFocus(page, page.locator('textarea[aria-label="Research request"]'), "Scout research request");
    await assertVisibleKeyboardFocus(page, locationInput, "Scout target location");

    await page.getByRole("button", { name: "Kansas", exact: true }).click();
    assert.equal(await locationInput.inputValue(), "Kansas", "switching state should move a state-only target to Kansas");
    await page.getByRole("button", { name: "Colorado", exact: true }).click();
    assert.equal(await locationInput.inputValue(), "Colorado", "switching to Colorado must update the target state");
    await page.getByRole("button", { name: "Kansas", exact: true }).click();
    await page.getByRole("button", { name: "RBTs", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "RBTs", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByLabel("Client age focus").count(), 0, "Professional recruiting is not age-filtered");

    await page.goto(baseUrl + "/territories", { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Territories");
    await assertNativeMobileChrome(page, "Territories");
    await page.getByRole("heading", { name: "Kansas City, Missouri" }).waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(await page.getByText("78", { exact: true }).count() > 0, true, "Territories should show the saved real-score snapshot");

    await page.goto(baseUrl + "/intelligence", { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Intelligence");
    await assertNativeMobileChrome(page, "More");
    await page.getByRole("heading", { name: "Decision queue" }).waitFor({ state: "visible" });
    await page.getByText("Kansas City, Missouri · CLIENT", { exact: true }).waitFor({ state: "visible" });

    await page.goto(baseUrl + "/?state=KS&engine=rbt&location=Wichita&query=Find%20RBT%20hiring", { waitUntil: "domcontentloaded" });
    await assertNoBodyOverflow(page, "Prefilled Scout");
    assert.equal(await page.getByRole("button", { name: "Kansas", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByRole("button", { name: "RBTs", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByLabel("Target city, ZIP, county or state").inputValue(), "Wichita");
    assert.equal(await page.locator('textarea[aria-label="Research request"]').inputValue(), "Find RBT hiring");
  } finally {
    await context.close();
  }
}

/** Test real mobile controls without launching a marketing campaign or collecting private health data. */
async function verifyClientGrowthOnIphone(baseUrl:string) {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const plan={
    mode:"family_acquisition",location:"Denver County, CO",state:"CO",ageBand:"2-18",
    verifiedTargetPopulation:124416,
    populationBasis:"2025 U.S. Census exact county ages 2–18; not ABA demand",
    demandStatus:"unverified",independentCapacityPublishers:0,directFamilyInquiries:0,
    staffReady:"unverified",secureIntakeReady:false,ageQualifiedFamiliesFound:0,
    actions:[
      {id:"activate_intake",title:"Make it possible for a family to reach your agency",status:"prepare",purpose:"Conversion",
        description:"Verify secure intake before advertising",metric:"Consented family inquiries",url:null,dependency:"Real agency contact"},
      {id:"local_service_page",title:"Create Denver page",status:"research",purpose:"High-intent search",
        description:"Research local ABA searches",metric:"Inbound inquiries",url:"https://www.google.com/search?q=ABA+Denver",dependency:"Verify actual service coverage"},
      {id:"google_business",title:"Verify business profile",status:"prepare",purpose:"Local discovery",
        description:"Review profile",metric:"Real calls",url:"https://business.google.com/",dependency:"Authorized agency ownership"},
      {id:"staff_capacity",title:"Recruit RBT coverage",status:"prepare",purpose:"Staffing readiness",
        description:"Verify RBT supervision and schedule",metric:"Confirmed openings",url:"/talent",dependency:"BCBA supervision"},
      {id:"public_program_research",title:"Research public service gaps",status:"research",purpose:"Community discovery",
        description:"Only institutional sources",metric:"Confirmed public facts",url:"https://www.google.com/search?q=Denver+resources",dependency:"No household profiling"},
    ],
    ethicalBoundary:"Public directories are market sources, not family leads.",
  };
  await page.route("**/api/intelligence/search", async (route)=>{
    if(route.request().method()!=="POST"){await route.continue();return;}
    await route.fulfill({
      contentType:"application/json",
      status:200,
      body:JSON.stringify({
        ok:true,state:"CO",engine:"client",clientGrowth:plan,screened:1,
        sourceStatus:[{source:"CMS NPPES",status:"complete",detail:"Sample public record"}],
        leads:[{
          id:"co-provider-sample",name:"Official Preschool Directory",kind:"referral",score:33,confidence:30,
          domain:"data.colorado.gov",website:"https://data.colorado.gov/dataset",location:"Denver County, CO",
          reasons:["Registry listing only"],unknowns:["Actual program ages not confirmed"],
          phones:[],emails:[],signals:[],evidence:[{
            id:"ref-1",sourceId:"co-cdec-licensed-childcare",title:"Official Preschool Directory",
            url:"https://data.colorado.gov/dataset",snippet:"Public nonresidential facility",
            query:"Public licensed facilities",capturedAt:"2026-10-08T00:00:00Z",purpose:"discover",
          }],
        }],
      }),
    });
  });
  try {
    await page.goto(baseUrl+"/?state=CO&engine=client&location=Denver%20County%2C%20CO",{
      waitUntil:"domcontentloaded",
    });
    await page.getByRole("button",{name:"Run research"}).click();
    await page.getByRole("heading",{name:"Where new families can find your agency"}).waitFor();
    assert.equal(await page.getByText("124,416",{exact:true}).count(),1);
    assert.equal(await page.getByText("public market sources (not family leads)").count(),1);
    await assertNoBodyOverflow(page,"Client family-growth actions on iPhone");
    assert.equal(await page.getByRole("button",{name:"CRM",exact:true}).count(),0,
      "An official preschool is not a direct opt-in family client record");
    await page.getByRole("button",{name:"Create 5 tasks"}).click();
    await page.getByText("Five tasks added").waitFor();
    const tasks=await page.evaluate(()=>{
      const value=window.localStorage.getItem("clearsteps.tasks.v1")??"[]";
      return JSON.parse(value) as Array<{title:string;entityType:string}>;
    });
    assert.equal(tasks.length,5,"Five real local operator tasks generated from source plan");
    assert(tasks.every((item)=>item.entityType==="territory"));
    await page.getByRole("button",{name:"Official Preschool Directory"}).click();
    await page.getByText("Market research, not a client inquiry").waitFor();
    assert.equal(await page.getByRole("button",{name:"Save to CRM"}).count(),0);
  } finally {
    await context.close();
  }
}

async function assertActiveNavigation(page: Page, expected: string) {
  const activeNav = page.locator('nav[aria-label="Clear Steps workspace"] a[aria-current="page"]');
  assert.equal(await activeNav.count(), 1, "exactly one desktop navigation item should expose aria-current=page");
  assert.equal((await activeNav.innerText()).trim(), expected);
}

async function assertNativeMobileChrome(page: Page, expected: string) {
  assert.equal(await page.locator(".workspaceRail").isVisible(), false, "mobile should not render the desktop workspace rail");
  assert.equal(await page.locator(".workspaceTopbar").isVisible(), false, "mobile should not render the desktop workspace topbar");

  const mobileNav = page.locator('nav[aria-label="ABA Engine primary navigation"]');
  await mobileNav.waitFor({ state: "visible" });
  assert.equal(await mobileNav.getByRole("link").count(), 5, "mobile should expose exactly five primary destinations");
  const active = mobileNav.locator('a[aria-current="page"]');
  assert.equal(await active.count(), 1, "mobile should expose one active primary destination");
  assert.equal((await active.innerText()).trim(), expected);
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

async function assertVisibleKeyboardFocus(
  _page: Page,
  focusLocator: Locator,
  label: string,
  indicatorLocator: Locator = focusLocator,
) {
  await focusLocator.focus();
  const focus = await indicatorLocator.evaluate((element) => {
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
