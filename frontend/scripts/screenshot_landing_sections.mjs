import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "/Users/SarMish/.gemini/antigravity/brain/60656fa7-6d8e-456e-98d6-cf4538af419d/screenshots/landing_sections";
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function captureSections() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Full page desktop
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-landing-fullpage-desktop.png"), fullPage: true });

  // Hero section
  const heroEl = page.locator("section, div").filter({ hasText: "Every invention leaves a trail" }).first();
  await heroEl.screenshot({ path: path.join(SCREENSHOT_DIR, "02-landing-hero-schematic.png") });

  // Section A
  const secA = page.locator("section").filter({ hasText: "SECTION A" }).first();
  await secA.screenshot({ path: path.join(SCREENSHOT_DIR, "03-landing-section-a-vocabulary.png") });

  // Section B
  const secB = page.locator("section").filter({ hasText: "SECTION B" }).first();
  await secB.screenshot({ path: path.join(SCREENSHOT_DIR, "04-landing-section-b-pipeline.png") });

  // Section C
  const secC = page.locator("section").filter({ hasText: "SECTION C" }).first();
  await secC.screenshot({ path: path.join(SCREENSHOT_DIR, "05-landing-section-c-workbench.png") });

  // Section D
  const secD = page.locator("section").filter({ hasText: "SECTION D" }).first();
  await secD.screenshot({ path: path.join(SCREENSHOT_DIR, "06-landing-section-d-landscape.png") });

  // Section G
  const secG = page.locator("section").filter({ hasText: "SECTION G" }).first();
  await secG.screenshot({ path: path.join(SCREENSHOT_DIR, "07-landing-section-g-trust.png") });

  // Full page mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-landing-fullpage-mobile.png"), fullPage: true });

  await browser.close();
  console.log("✓ All landing section screenshots captured successfully!");
}

captureSections().catch(console.error);

