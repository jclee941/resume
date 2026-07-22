const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const { captureState, dynamicStateDescriptors, extractPageOccurrences, installProductionResponseCache } =
  require('./fixtures/public-copy-ledger-extractor');
const { validateSourceMapBootstrap } = require('./fixtures/public-copy-source-audit');
const { canonicalBaselineCommand, compareOccurrences, DYNAMIC_STATE_SHAPE, runtimeCopy, serializeBaseline,
  serializeCompactSorted, sha256, validateBaselineReceipt } =
  require('./fixtures/public-copy-ledger-serializer');

const ROUTES = [{ route: '/', locale: 'ko' }, { route: '/ko/', locale: 'ko' }, { route: '/en/', locale: 'en' }, { route: '/ja/', locale: 'ja' }];
const DESKTOP = { key: 'desktop-1280x900', width: 1280, height: 900, dpr: 1 };
const MOBILE = { key: 'mobile-375x812', width: 375, height: 812, dpr: 1 };
const sourceMapPath = process.env.PORTFOLIO_LEDGER_SOURCE_MAP;
if (sourceMapPath) validateSourceMapBootstrap(JSON.parse(fs.readFileSync(sourceMapPath, 'utf8')));

async function captureRoute(page, context, routeInfo, occurrences) {
  const copy = runtimeCopy(routeInfo.locale, process.env.PORTFOLIO_LEDGER_MODE);
  await captureState(page, occurrences, routeInfo, 'initial', DESKTOP);
  await captureState(page, occurrences, routeInfo, 'mobile-nav-open', MOBILE, async (current) => {
    const toggle = current.locator('.nav-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(current.locator('.nav-links')).toHaveClass(/open/);
  });
  await captureState(page, occurrences, routeInfo, 'projects-expanded', DESKTOP, async (current) => {
    const button = current.locator('[data-projects-expand]');
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
  });
  await captureState(page, occurrences, routeInfo, 'cover-expanded', DESKTOP, async (current) => {
    const details = current.locator('#cover-letter details');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
  });

  const dynamic = await dynamicStateDescriptors(page, routeInfo, DESKTOP);
  expect(dynamic).toEqual(DYNAMIC_STATE_SHAPE);
  for (const id of dynamic.capabilities) {
    await captureState(page, occurrences, routeInfo, `capability-${id}`, DESKTOP, async (current) => {
      const control = current.locator(`[data-capability-control="${id}"]`);
      await control.click();
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      await expect(current.locator('[data-capability-control][aria-pressed="true"]')).toHaveCount(1);
      await expect(current.locator('#projects')).toHaveAttribute('data-capability-selected', id);
      await expect(current.locator('[data-capability-status][role="status"]'))
        .toHaveText(copy.capabilities[id]);
    });
  }
  await captureState(page, occurrences, routeInfo, 'capability-product-ui-cleared', DESKTOP, async (current) => {
    const control = current.locator('[data-capability-control="product-ui"]');
    await control.click();
    await control.click();
    await expect(current.locator('[data-capability-control][aria-pressed="false"]')).toHaveCount(5);
    await expect(current.locator('#projects')).not.toHaveAttribute('data-capability-selected');
    await expect(current.locator('[data-capability-status][role="status"]')).toHaveText(copy.clear);
  });
  for (let index = 0; index < dynamic.timelines; index += 1) {
    await captureState(page, occurrences, routeInfo, `timeline-${index}-expanded`, DESKTOP, async (current) => {
      const node = current.locator('.timeline-node').nth(index);
      const button = node.locator('.timeline-expand-btn');
      await button.click();
      await expect(node).toHaveClass(/is-expanded/);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      const details = node.locator('.timeline-details');
      await expect(details).toHaveAttribute('aria-hidden', 'false');
      await expect(button).toHaveAttribute('aria-controls', await details.getAttribute('id'));
      await expect(button.locator('.expand-text')).toHaveText(copy.collapse);
      const company = (await node.locator('.timeline-company').innerText()).trim();
      await expect(button).toHaveAccessibleName(`${copy.collapse} ${copy.detail} ${company}`);
    });
  }

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  });
  await captureState(page, occurrences, routeInfo, 'clipboard-success', DESKTOP, async (current) => {
    const link = current.locator('[data-contact-email]').first();
    await expect(link).toHaveAttribute('data-contact-email', 'qws941@kakao.com');
    await link.click();
    await expect(link).toHaveClass(/is-copied/);
    expect(await current.evaluate(() => navigator.clipboard.readText())).toBe('qws941@kakao.com');
    await expect(current.locator('.contact-copy-status[role="status"]')).toHaveText(copy.clipboard);
  });
  await captureState(page, occurrences, routeInfo, 'mobile-actions-visible', MOBILE, async (current) => {
    await expect(current.locator('.mobile-actions')).toBeHidden();
    await current.evaluate(() => window.scrollTo(0, 160));
    expect(await current.locator('#contact').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom <= 0 || rect.top >= window.innerHeight;
    })).toBe(true);
    const actions = current.getByRole('complementary', { name: copy.region, exact: true })
      .and(current.locator('.mobile-actions.is-visible:not([hidden])'));
    await expect(actions).toBeVisible();
    await expect(actions.locator('.mobile-actions__link')).toHaveCount(3);
    for (const [label, href] of copy.actions) {
      await expect(actions.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
    }
  });
  await captureState(page, occurrences, routeInfo, 'skill-search-cloudflare', DESKTOP, async (current) => {
    await current.locator('#skill-search-input').fill('Cloudflare');
    await expect(current.locator('#skill-search-count[aria-live="polite"]')).toHaveText(copy.search);
    await expect.poll(() => current.evaluate(() => ({
      cards: [...document.querySelectorAll('.skill-domain-card')]
        .filter((item) => item.style.display !== 'none').length,
      items: [...document.querySelectorAll('.skill-item')]
        .filter((item) => item.style.display !== 'none').length,
    }))).toEqual({ cards: 2, items: 2 });
    expect(await current.evaluate(() => [...document.querySelectorAll('.skill-domain-card,.skill-item')]
      .filter((item) => item.style.display !== 'none').length)).toBe(4);
  });
  for (const domain of dynamic.domains) {
    await captureState(page, occurrences, routeInfo, `skill-domain-${domain}-expanded`, DESKTOP, async (current) => {
      const card = current.locator(`.skill-domain-card[data-domain="${domain}"]`);
      await card.click();
      await expect(card).toHaveAttribute('aria-expanded', 'true');
      await expect(current.locator('.skill-domain-card[aria-expanded="true"]')).toHaveCount(1);
      const panel = current.locator(`#${await card.getAttribute('aria-controls')}`);
      await expect(panel).not.toHaveAttribute('hidden');
      await expect(panel).toBeVisible();
      await expect(card.locator('.skill-list')).toBeVisible();
      await expect(card.locator('.skill-evidence-drawer')).toBeVisible();
      await expect(card.locator('.skill-evidence-drawer__title')).toHaveText(copy.drawer);
    });
  }
}

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

  const context = await browser.newContext({ locale: 'ko-KR', reducedMotion: 'reduce', deviceScaleFactor: 1 });
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
      const pathname = new URL(typeof input === 'string' ? input : input.url, location.href).pathname;
      return /^\/(?:en\/|ja\/)?resume-data\.json$/.test(pathname)
        ? Promise.resolve(new Response('', { status: 503 }))
        : originalFetch(input, init);
    };
  });
  for (const routeInfo of ROUTES) {
    await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
    await page.goto(routeInfo.route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'error');
    await expect(page.locator('[data-portfolio-bootstrap-status="error"][role="status"]'))
      .toHaveText(runtimeCopy(routeInfo.locale, process.env.PORTFOLIO_LEDGER_MODE).bootstrap);
    occurrences.push(...await extractPageOccurrences(page, {
      ...routeInfo, state: 'bootstrap-error', viewport: DESKTOP,
    }));
  }
  expect(cacheStats.replayed).toBeGreaterThan(0); await context.close();

  occurrences.sort(compareOccurrences);
  const capturedAt = new Date().toISOString();
  const baseline = { version: 1, capturedAt, baseSha: expectedSha, expectedHealthSha: health.git_sha, sourceUrl, occurrences };
  const bytes = serializeBaseline(baseline);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, bytes, 'utf8');
  const command = canonicalBaselineCommand({ baseSha: expectedSha, sourceUrl, output });
  const receipt = { version: 1, mode: 'baseline', baseSha: expectedSha, liveHealthSha: health.git_sha, ledgerSha256: sha256(bytes), routes: ROUTES.map(({ route }) => route), occurrenceCount: occurrences.length, capturedAt, command };
  const receiptBytes = serializeCompactSorted(receipt);
  validateBaselineReceipt(JSON.parse(receiptBytes), bytes);
  fs.writeFileSync(path.join(path.dirname(output), 'ledger-baseline.receipt.json'), receiptBytes, 'utf8');
});

test('DOM and accessible extraction share rendered visibility', async ({ page }) => {
  await page.setContent(`
    <button id="visible">Visible control</button>
    <button id="collapsed" style="visibility:collapse">Collapsed control</button>
    <button id="content-hidden" style="content-visibility:hidden">Content hidden control</button>
    <button id="zero-area" style="width:0;height:0;padding:0;border:0;font-size:0">Zero area control</button>
    <div hidden><button id="ancestor-hidden">Ancestor hidden control</button></div>
  `);
  const rows = await extractPageOccurrences(page, {
    locale: 'en', route: '/en/', state: 'visibility-contract', viewport: DESKTOP,
  });
  for (const kind of ['dom-text', 'accessible-tree']) {
    const values = rows.filter((row) => row.kind === kind).map((row) => row.value).join('\n');
    expect(values).toContain('Visible control');
    for (const hidden of ['Collapsed', 'Content hidden', 'Zero area', 'Ancestor hidden'])
      expect(values).not.toContain(`${hidden} control`);
  }
});
