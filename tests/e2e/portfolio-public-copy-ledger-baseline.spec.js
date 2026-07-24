const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { extractPageOccurrences, installProductionResponseCache } = require('./fixtures/public-copy-ledger-extractor');
const { validateSourceMapBootstrap } = require('./fixtures/public-copy-source-audit');
const {
  canonicalBaselineCommand,
  compareOccurrences,
  runtimeCopy,
  serializeBaseline,
  serializeCompactSorted,
  sha256,
  validateBaselineReceipt,
} = require('./fixtures/public-copy-ledger-serializer');
const { captureRoute } = require('./portfolio-public-copy-ledger-capture');

const ROUTES = [
  { route: '/', locale: 'ko' },
  { route: '/ko/', locale: 'ko' },
  { route: '/en/', locale: 'en' },
  { route: '/ja/', locale: 'ja' },
];
const DESKTOP = { key: 'desktop-1280x900', width: 1280, height: 900, dpr: 1 };
const sourceMapPath = process.env.PORTFOLIO_LEDGER_SOURCE_MAP;
if (sourceMapPath) validateSourceMapBootstrap(JSON.parse(fs.readFileSync(sourceMapPath, 'utf8')));

test('captures the immutable production public-copy baseline', async ({ browser, request }) => {
  test.skip(process.env.PORTFOLIO_LEDGER_MODE !== 'baseline', 'baseline mode only');
  test.setTimeout(20 * 60 * 1000);
  const expectedSha = process.env.PORTFOLIO_LEDGER_EXPECTED_SHA;
  const output = process.env.PORTFOLIO_LEDGER_OUTPUT;
  const sourceUrl = process.env.PORTFOLIO_LEDGER_URL;
  expect(expectedSha).toMatch(/^[0-9a-f]{40}$/);
  expect(output).toBeTruthy();
  expect(sourceUrl).toMatch(/^https?:\/\//);
  const healthResponse = await request.get('/health');
  expect(healthResponse.ok()).toBe(true);
  const health = await healthResponse.json();
  expect(health.git_sha).toBe(expectedSha);

  const context = await browser.newContext({
    locale: 'ko-KR',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  });
  const cacheStats = await installProductionResponseCache(context);
  await context.addInitScript(() => {
    const nativeScrollTo = window.scrollTo.bind(window);
    window.scrollTo = (...args) => {
      if (args[0] && typeof args[0] === 'object') nativeScrollTo({ ...args[0], behavior: 'auto' });
      else nativeScrollTo(...args);
    };
  });
  const page = await context.newPage();
  const occurrences = [];
  for (const routeInfo of ROUTES) await captureRoute(page, context, routeInfo, occurrences);
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const pathname = new URL(typeof input === 'string' ? input : input.url, location.href)
        .pathname;
      return /^\/(?:en\/|ja\/)?resume-data\.json$/.test(pathname)
        ? Promise.resolve(new Response('', { status: 503 }))
        : originalFetch(input, init);
    };
  });
  for (const routeInfo of ROUTES) {
    await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
    await page.goto(routeInfo.route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'error');
    await expect(
      page.locator('[data-portfolio-bootstrap-status="error"][role="status"]')
    ).toHaveText(runtimeCopy(routeInfo.locale, process.env.PORTFOLIO_LEDGER_MODE).bootstrap);
    occurrences.push(
      ...(await extractPageOccurrences(page, {
        ...routeInfo,
        state: 'bootstrap-error',
        viewport: DESKTOP,
      }))
    );
  }
  expect(cacheStats.replayed).toBeGreaterThan(0);
  await context.close();

  occurrences.sort(compareOccurrences);
  const capturedAt = new Date().toISOString();
  const baseline = {
    version: 1,
    capturedAt,
    baseSha: expectedSha,
    expectedHealthSha: health.git_sha,
    sourceUrl,
    occurrences,
  };
  const bytes = serializeBaseline(baseline);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, bytes, 'utf8');
  const command = canonicalBaselineCommand({ baseSha: expectedSha, sourceUrl, output });
  const receipt = {
    version: 1,
    mode: 'baseline',
    baseSha: expectedSha,
    liveHealthSha: health.git_sha,
    ledgerSha256: sha256(bytes),
    routes: ROUTES.map(({ route }) => route),
    occurrenceCount: occurrences.length,
    capturedAt,
    command,
  };
  const receiptBytes = serializeCompactSorted(receipt);
  validateBaselineReceipt(JSON.parse(receiptBytes), bytes);
  fs.writeFileSync(
    path.join(path.dirname(output), 'ledger-baseline.receipt.json'),
    receiptBytes,
    'utf8'
  );
});
