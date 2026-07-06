const { test, expect } = require('@playwright/test');

test.describe('Portfolio visual accessibility', () => {
  test('timeline expand buttons control real detail regions', async ({ page }) => {
    await page.goto('/ko/', { waitUntil: 'domcontentloaded' });

    const buttons = page.locator('button.timeline-expand-btn');
    await expect(buttons.first()).toBeVisible();
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const controls = await button.getAttribute('aria-controls');
      expect(controls, `timeline button ${i} aria-controls`).toBeTruthy();

      const visibleText = (await button.innerText()).trim();
      const label = await button.getAttribute('aria-label');
      expect(label, `timeline button ${i} accessible name`).toContain(visibleText);

      const details = page.locator(`#${controls}`);
      await expect(details, `controlled details for button ${i}`).toHaveCount(1);
      await expect(details).toHaveAttribute('aria-hidden', 'true');

      await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(details).toHaveAttribute('aria-hidden', 'false');
    }
  });

  test('mobile skill search keeps a 44px touch target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ko/', { waitUntil: 'domcontentloaded' });

    const search = page.locator('#skill-search-input');
    await expect(search).toBeVisible();
    await search.scrollIntoViewIfNeeded();
    const box = await search.boundingBox();

    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});
