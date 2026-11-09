import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/SarMish/.gemini/antigravity/brain/60656fa7-6d8e-456e-98d6-cf4538af419d/screenshots/intelligence_v2';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3001';

const ROUTES = [
  { name: 'app-corpus-explorer', path: '/app/corpus' },
  { name: 'app-claim-matrix', path: '/app/claim-map' },
  { name: 'app-knowledge-graph', path: '/app/graph' },
  { name: 'app-dossier-studio', path: '/app/dossier' },
  { name: 'app-eval-laboratory', path: '/app/eval-lab' },
  { name: 'app-search-intelligence', path: '/app/search' },
];

async function runAudit() {
  console.log('🚀 Starting Patent Intelligence 2.0 Browser Audit...');
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

    try {
      const resp = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      const status = resp ? resp.status() : 'no-response';

      await page.waitForTimeout(1000);

      // Take desktop screenshot
      const shotPath = path.join(SCREENSHOT_DIR, `${route.name}-desktop.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      console.log(`✓ ${route.name}: status ${status}, saved ${shotPath}`);

      auditReport.push({
        name: route.name,
        path: route.path,
        status,
        errors,
        consoleLogs,
        screenshot: shotPath
      });
    } catch (err) {
      console.error(`✗ Error loading ${route.path}:`, err.message);
      auditReport.push({
        name: route.name,
        path: route.path,
        error: err.message
      });
    } finally {
      await page.close();
    }
  }

  // Test Command Palette interaction
  try {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // Press Meta+k or click search trigger button
    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    await page.waitForTimeout(500);

    const shotCmdK = path.join(SCREENSHOT_DIR, 'command-palette-modal.png');
    await page.screenshot({ path: shotCmdK, fullPage: false });
    console.log(`✓ command-palette: saved ${shotCmdK}`);
    await page.close();
  } catch (err) {
    console.error('✗ Command palette screenshot error:', err.message);
  }

  await browser.close();

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'audit_report.json'),
    JSON.stringify(auditReport, null, 2)
  );
  console.log('🎉 Audit Complete!');
}

runAudit().catch(console.error);

