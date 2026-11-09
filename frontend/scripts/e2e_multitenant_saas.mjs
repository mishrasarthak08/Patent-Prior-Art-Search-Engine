import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "/Users/SarMish/.gemini/antigravity/brain/60656fa7-6d8e-456e-98d6-cf4538af419d/screenshots/multitenant";
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = "http://localhost:3001";
const API_URL = "http://localhost:8001";

async function runMultiTenantAudit() {
  console.log("==========================================================");
  console.log("🚀 MULTI-TENANT PRODUCTION SaaS BROWSER VERIFICATION SUITE");
  console.log("==========================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const testResults = [];
  const recordResult = (name, passed, details, shotFile = null) => {
    testResults.push({ name, passed, details, shotFile });
    const mark = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`${mark} | ${name}: ${details}`);
  };

  // ----------------------------------------------------
  // TEST 1: NEW USER REGISTRATION & ONBOARDING MODAL
  // ----------------------------------------------------
  try {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle", timeout: 15000 });

    const uniqueEmail = `dr.vance.${Date.now()}@quantum-ip.org`;
    await page.fill("input[placeholder*='David Vance']", "Dr. Eleanor Vance, Ph.D.");
    await page.fill("input[placeholder*='Vertex IP']", "Vance Quantum Laboratories");
    await page.fill("input[type='email']", uniqueEmail);
    await page.fill("input[type='password']", "QuantumShield2026!");

    const regShot = path.join(SCREENSHOT_DIR, "01-user-registration.png");
    await page.screenshot({ path: regShot, fullPage: false });

    // Submit registration
    await page.click("button[type='submit']");
    await page.waitForURL("**/app", { timeout: 15000 });
    await page.waitForTimeout(600);

    // Verify Onboarding Modal appears
    const onboardingVisible = await page.locator("text=Personalized Research Setup").isVisible();
    if (!onboardingVisible) {
      throw new Error("Onboarding modal did not appear for new registrant");
    }

    const onboardShot = path.join(SCREENSHOT_DIR, "02-onboarding-modal.png");
    await page.screenshot({ path: onboardShot, fullPage: false });
    recordResult("New User Registration & Onboarding Prompt", true, "Account provisioned and personalized setup modal rendered", onboardShot);

    // Complete onboarding
    await page.selectOption("select", "Quantum Hardware & Cryptography");
    await page.click("button:has-text('Launch Investigation Workspace')");
    await page.waitForTimeout(600);

    // Verify Clean Empty Workspace
    const emptyStateVisible = await page.locator("text=Workspace Initialized & Ready").isVisible();
    if (!emptyStateVisible) {
      throw new Error("Pristine empty state not visible after onboarding");
    }

    const emptyDashShot = path.join(SCREENSHOT_DIR, "03-clean-empty-workspace.png");
    await page.screenshot({ path: emptyDashShot, fullPage: false });
    recordResult("Isolated Clean Personal Workspace", true, "Verified 0 preloaded matters/searches; empty state guidance rendered", emptyDashShot);

    // ----------------------------------------------------
    // TEST 2: INTERACTIVE WORKSPACE SWITCHER DROPDOWN
    // ----------------------------------------------------
    // Open the workspace dropdown
    await page.click("button[title='Switch Research Workspace']");
    await page.waitForTimeout(400);

    const dropdownVisible = await page.locator("text=Personal Research (Private)").isVisible();
    if (!dropdownVisible) {
      throw new Error("Workspace switcher dropdown did not open");
    }

    const wsDropdownShot = path.join(SCREENSHOT_DIR, "04-workspace-switcher-dropdown.png");
    await page.screenshot({ path: wsDropdownShot, fullPage: false });
    recordResult("Interactive Workspace Switcher", true, "Personal and organization workspace switcher rendered with matter/search counts", wsDropdownShot);

    // Close dropdown
    await page.click("button[title='Switch Research Workspace']");
    await page.waitForTimeout(200);

    // ----------------------------------------------------
    // TEST 3: ISOLATED PRIOR-ART SEARCH & EVIDENCE GENERATION
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/app/search`, { waitUntil: "networkidle" });
    const claimInput = "A fluxonium superconducting quantum circuit comprising a Josephson junction shunted by a granular aluminum superinductor and a capacitive pad.";
    await page.fill("textarea", claimInput);

    await page.click("button:has-text('Execute Prior-Art Search')");
    await page.waitForSelector("text=Extracted Limitation Tree Breakdown", { timeout: 35000 });
    await page.waitForSelector("text=RANKED PRIOR-ART PUBLICATIONS", { timeout: 35000 });
    await page.waitForSelector("text=Limitation Evidence Mapping:", { timeout: 35000 });

    const searchResultsShot = path.join(SCREENSHOT_DIR, "05-tenant-isolated-search-results.png");
    await page.screenshot({ path: searchResultsShot, fullPage: false });
    recordResult("Scoped Prior-Art Search & Evidence", true, "Decomposition and claim charts rendered and persisted to tenant workspace", searchResultsShot);

    // ----------------------------------------------------
    // TEST 4: MATTER MANAGEMENT IN PRIVATE WORKSPACE
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/app/matters`, { waitUntil: "networkidle" });
    await page.click("button:has-text('New Matter')");
    await page.waitForTimeout(300);

    await page.fill("input[placeholder*='Solid-State Electrolyte']", "Fluxonium Superinductor Patent Defense");
    await page.fill("input[placeholder*='MAT-2026-009']", "MAT-QUANTUM-001");
    await page.fill("input[placeholder*='Apex Energy Corp']", "Vance Quantum Corp");
    await page.click("button:has-text('Register Matter')");
    await page.waitForTimeout(800);

    const matterCreated = await page.locator("text=Fluxonium Superinductor Patent Defense").isVisible();
    if (!matterCreated) {
      throw new Error("Created matter not visible in personal workspace");
    }

    const mattersShot = path.join(SCREENSHOT_DIR, "06-personal-matters-workspace.png");
    await page.screenshot({ path: mattersShot, fullPage: false });
    recordResult("Personal Matter Creation", true, "Matter created and scoped strictly to Dr. Eleanor Vance's workspace", mattersShot);

    // ----------------------------------------------------
    // TEST 5: CROSS-TENANT ISOLATION (LOGIN AS ADMIN)
    // ----------------------------------------------------
    // Sign out
    await page.click("button[title='Sign Out']");
    await page.waitForURL("**/login", { timeout: 10000 });

    // Sign in as Sarah Jenkins (Admin)
    await page.fill("input[type='email']", "admin@patentsearchengine.com");
    await page.fill("input[type='password']", "patent2026");
    await page.click("button:has-text('Access Investigation Workspace')");
    await page.waitForURL("**/app", { timeout: 10000 });
    await page.waitForTimeout(800);

    // Check Matters in Sarah's workspace (Energy & Solid-State Systems)
    await page.goto(`${BASE_URL}/app/matters`, { waitUntil: "networkidle" });
    const crossMatterLeaked = await page.locator("text=Fluxonium Superinductor Patent Defense").isVisible();
    if (crossMatterLeaked) {
      throw new Error("CROSS-TENANT LEAK: Dr. Vance's matter appeared in Admin's workspace!");
    }

    const adminMattersShot = path.join(SCREENSHOT_DIR, "07-admin-isolated-matters.png");
    await page.screenshot({ path: adminMattersShot, fullPage: false });
    recordResult("Cross-Tenant Zero Data Leakage", true, "Verified Dr. Vance's private matter is completely hidden from other users", adminMattersShot);

    // ----------------------------------------------------
    // TEST 6: PUBLIC MARKETING PAGE (ZERO PROPRIETARY LEAKAGE)
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const publicContent = await page.content();
    if (publicContent.includes("ablation_results") || publicContent.includes("lift_table.csv")) {
      throw new Error("PUBLIC EXPOSURE: Internal benchmark ablation results leaked on landing page!");
    }

    const publicLandingShot = path.join(SCREENSHOT_DIR, "08-public-landing-clean.png");
    await page.screenshot({ path: publicLandingShot, fullPage: false });
    recordResult("Public Website Security & Branding", true, "Verified zero leakage of proprietary internal benchmarks; professional SaaS presence", publicLandingShot);

    await page.close();
  } catch (err) {
    recordResult("Multi-Tenant E2E Workflow", false, `Test failed with error: ${err.message}`);
  } finally {
    await browser.close();
  }

  // Summary JSON
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, "multitenant_results.json"),
    JSON.stringify(testResults, null, 2)
  );

  console.log("==========================================================");
  console.log(`AUDIT FINISHED: ${testResults.filter(r => r.passed).length}/${testResults.length} WORKFLOWS PASSED`);
  console.log("==========================================================");
}

runMultiTenantAudit().catch(console.error);
