// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Regression: the server-rendered project cards in #project-list must be
 * VISIBLE. A pre-existing CSS bug applied the case-study grid's hidden entrance
 * state (`opacity: 0`) to ALL `.project-card`s, including the static ones that
 * never receive the `.animate-in` class — leaving the #projects section blank.
 */

async function safeGoto(page, url = '/') {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (!response || response.status() >= 500) {
    test.skip(true, 'Server unavailable');
  }
}

test.describe('#projects static cards are visible', () => {
  test('server-rendered project cards render with opacity 1', async ({ page }) => {
    await safeGoto(page, '/');
    const list = page.locator('#projects #project-list');
    await expect(list).toHaveCount(1);

    const cards = page.locator('#projects #project-list .project-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // The first card must be actually visible (not opacity:0).
    await cards.first().scrollIntoViewIfNeeded();
    const opacity = await cards.first().evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.9);

    // And Playwright's visibility heuristic agrees.
    await expect(cards.first()).toBeVisible();
  });

  test('all static project cards are non-transparent', async ({ page }) => {
    await safeGoto(page, '/');
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const transparentCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('#projects #project-list .project-card');
      let hidden = 0;
      cards.forEach((c) => {
        if (Number(getComputedStyle(c).opacity) < 0.9) hidden += 1;
      });
      return hidden;
    });
    expect(transparentCount).toBe(0);
  });
});
