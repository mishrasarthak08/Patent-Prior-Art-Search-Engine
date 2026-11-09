import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/SarMish/.gemini/antigravity/brain/60656fa7-6d8e-456e-98d6-cf4538af419d/screenshots/baseline';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3001';

const PUBLIC_ROUTES = [
  { name: 'home', path: '/' },
  { name: 'product', path: '/product' },
  { name: 'how-it-works', path: '/how-it-works' },
  { name: 'pricing', path: '/pricing' },
  { name: 'security', path: '/security' },
  { name: 'documentation', path: '/documentation' },
  { name: 'faq', path: '/faq' },
  { name: 'contact', path: '/contact' },
  { name: 'solutions-professionals', path: '/solutions/patent-professionals' },
  { name: 'features-claim-analysis', path: '/features/claim-analysis' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
];

const APP_ROUTES = [
  { name: 'app-dashboard', path: '/app' },
  { name: 'app-search', path: '/app/search' },
  { name: 'app-claim-charts', path: '/app/claim-charts' },
  { name: 'app-explorer', path: '/app/explorer' },
  { name: 'app-compare', path: '/app/compare' },
  { name: 'app-matters', path: '/app/matters' },
  { name: 'app-saved', path: '/app/saved' },
  { name: 'app-team', path: '/app/team' },
  { name: 'app-audit', path: '/app/audit' },
  { name: 'app-settings', path: '/app/settings' },
];

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const auditReport = [];

  for (const route of [...PUBLIC_ROUTES, ...APP_ROUTES]) {
    const consoleLogs = [];
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleLogs.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    console.log(`Auditing: ${route.name} (${route.path})`);
    try {
      const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(600);

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // Capture desktop screenshot
      const desktopPath = path.join(SCREENSHOT_DIR, `${route.name}-desktop.png`);
      await page.screenshot({ path: desktopPath, fullPage: false });

      auditReport.push({
        route: route.name,
        path: route.path,
        status: response ? response.status() : 'no-response',
        horizontalOverflow: overflow,
        consoleErrors: consoleLogs,
        pageErrors: errors,
        screenshot: desktopPath
      });
    } catch (e) {
      console.error(`Error on ${route.path}:`, e.message);
      auditReport.push({
        route: route.name,
        path: route.path,
        error: e.message
      });
    }
  }

  // Mobile test for Home and Search
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [{ name: 'home-mobile', path: '/' }, { name: 'search-mobile', path: '/app/search' }]) {
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(600);
    const mobilePath = path.join(SCREENSHOT_DIR, `${route.name}.png`);
    await page.screenshot({ path: mobilePath, fullPage: false });
  }

  await browser.close();
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'audit_report.json'),
    JSON.stringify(auditReport, null, 2)
  );
  console.log('Baseline audit completed successfully. Report written.');
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});

