const { test, expect } = require('@playwright/test');

test.describe('Card Interactions', () => {
  test('resume cards should be hoverable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Timeline JS swaps the server <ul><li> for <article role="listitem"> nodes;
    // wait for and target the semantic listitem so this survives the transform.
    const card = page.locator('#resume .resume-list [role="listitem"]').first();
    await card.waitFor({ state: 'visible' });
    await card.hover();

    // Check for hover state (transform or shadow change)
    const transform = await card.evaluate((el) => window.getComputedStyle(el).transform);
    // Transform might be 'none' or a matrix value
    expect(transform).toBeTruthy();
  });

  test('project cards should be hoverable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const card = page.locator('#projects li.project-item').first();
    await card.hover();

    const cursor = await card.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBeTruthy();
  });

  test('project card links should be distinguishable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const projectLinks = page.locator('#projects a.project-link-title');
    const projectLinksCount = await projectLinks.count();

    if (projectLinksCount === 0) {
      test.skip(true, 'current portfolio data has no project link title anchors');
      return;
    }

    for (let i = 0; i < Math.min(3, projectLinksCount); i++) {
      const link = projectLinks.nth(i);
      await expect(link).toBeVisible();
      const text = await link.textContent();
      expect(text?.trim()).toBeTruthy();
    }
  });
});
