// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Declutter redesign CONTRACT.
 *
 * Encodes the clean dark-neutral layout, no terminal CLI, no neon/cyberpunk
 * chrome: ~7-8 sections, no junior gimmicks, no empty/placeholder sections,
 * calm hero, no skill progress bars, no repeated incident-stage rows, one
 * consolidated "operated" section.
 *
 * RED first against the current cluttered page; GREEN after the redesign.
 */

/** @param {import('@playwright/test').Page} page */
async function go(page, url = '/') {
  const r = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (!r || r.status() >= 500) test.skip(true, 'server unavailable');
  // trigger scroll-reveal across the whole page
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((res) => setTimeout(res, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

test.describe('Declutter — removed gimmick sections', () => {
  test('S1: junk sections are gone', async ({ page }) => {
    await go(page, '/');
    for (const id of ['status', 'observability', 'case-studies']) {
      await expect(page.locator(`#${id}`)).toHaveCount(0);
    }
  });

  test('S1: section count is lean (<= 9 content sections)', async ({ page }) => {
    await go(page, '/');
    const n = await page.locator('main section[id]').count();
    expect(n).toBeLessThanOrEqual(9);
  });
});

test.describe('Declutter — gimmick markup/commands absent', () => {
  test('S2: no easter-egg DOM overlays', async ({ page }) => {
    await go(page, '/');
    for (const sel of [
      '.hack-mode-overlay',
      '.snake-game-overlay',
      '.mission-control',
      '.mc-status-bar',
      '.chat-widget',
      '.section-guestbook',
    ]) {
      await expect(page.locator(sel)).toHaveCount(0);
    }
  });

  test('S2: no ops-dashboard placeholder stats (--)', async ({ page }) => {
    await go(page, '/');
    const dashes = await page
      .locator('.stat-value, .observability-stat .stat-value')
      .filter({ hasText: '--' })
      .count();
    expect(dashes).toBe(0);
  });
});

test.describe('Declutter — terminal CLI and chrome absent', () => {
  test('S3: terminal CLI, commands, and cyberpunk chrome are removed', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#cli-container, #terminal-input, #cli-output')).toHaveCount(0);
    expect(await page.evaluate(() => 'terminalCommands' in window)).toBe(false);
    await expect(page.locator('.terminal-window, .terminal-titlebar, .section-cmd')).toHaveCount(0);
  });

  test('S3: clean hero has one title and no typing/KPI/status gimmicks', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#hero .hero-title')).toHaveCount(1);
    await expect(page.locator('#hero .typing-effect')).toHaveCount(0);
    await expect(page.locator('#hero .cursor')).toHaveCount(0);
    await expect(page.locator('#hero .hero-kpi-grid')).toHaveCount(0);
    await expect(page.locator('#hero .status-seeking')).toHaveCount(0);
  });
});

test.describe('Declutter — skills have no progress bars', () => {
  test('S4: no skill progress bars or percent proficiency', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#skills .skill-item__bar')).toHaveCount(0);
    const pct = await page
      .locator('#skills')
      .evaluate((el) => /\b\d{1,3}\s?%/.test(el.textContent || ''));
    expect(pct).toBe(false);
  });
});

test.describe('Declutter — experience has no repeated incident-stage rows', () => {
  test('S5: incident-stage icon rows removed', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#resume .incident-stage')).toHaveCount(0);
  });
});
