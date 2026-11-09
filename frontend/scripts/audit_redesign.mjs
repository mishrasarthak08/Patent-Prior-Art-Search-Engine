import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/SarMish/.gemini/antigravity/brain/60656fa7-6d8e-456e-98d6-cf4538af419d/screenshots/redesign';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3001';

const ROUTES = [
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

async function runRedesignAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const auditReport = [];

  for (const route of ROUTES) {
    const page = await context.newPage();
    const consoleLogs = [];
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleLogs.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    console.log(`Auditing redesign: ${route.name} (${route.path})`);
    try {
      const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

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
    } finally {
      await page.close();
    }
  }

  // Interactive Live Search Verification
  console.log('Testing live prior-art search workflow on /app/search...');
  const searchPage = await context.newPage();
  await searchPage.goto(`${BASE_URL}/app/search`, { waitUntil: 'networkidle' });
  await searchPage.waitForTimeout(500);
  
  // Click submit search button
  const submitBtn = await searchPage.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('Clicked Execute Prior-Art Search, awaiting candidates...');
    await searchPage.waitForTimeout(3000);
    const searchResultPath = path.join(SCREENSHOT_DIR, 'app-search-active-results.png');
    await searchPage.screenshot({ path: searchResultPath, fullPage: false });
    console.log('Captured active search results screenshot at:', searchResultPath);
  }
  await searchPage.close();

  // Mobile Viewport Verification (390x844)
  console.log('Testing mobile viewports...');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  for (const route of [
    { name: 'home-mobile', path: '/' },
    { name: 'search-mobile', path: '/app/search' },
    { name: 'claim-charts-mobile', path: '/app/claim-charts' }
  ]) {
    const mPage = await mobileContext.newPage();
    await mPage.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
    await mPage.waitForTimeout(400);
    const mPath = path.join(SCREENSHOT_DIR, `${route.name}.png`);
    await mPage.screenshot({ path: mPath, fullPage: false });
    await mPage.close();
  }

  await browser.close();
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'audit_report.json'),
    JSON.stringify(auditReport, null, 2)
  );
  console.log('Redesign audit completed successfully. Report written.');
}

runRedesignAudit().catch(err => {
  console.error(err);
  process.exit(1);
});

