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

  for (const locale of ['ko', 'en', 'ja']) {
    test(`${locale} about content fits a 320px viewport without clipping`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(`/${locale}/`, { waitUntil: 'domcontentloaded' });
      const dimensions = await page.locator('.about-grid').evaluate((grid) => ({
        viewport: window.innerWidth,
        body: document.body.scrollWidth,
        panels: [...grid.children].map((panel) => panel.getBoundingClientRect().right),
      }));

      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
      for (const right of dimensions.panels) {
        expect(right).toBeLessThanOrEqual(dimensions.viewport);
      }
    });

    test(`${locale} skill search uses the shared component radius`, async ({ page }) => {
      await page.goto(`/${locale}/`, { waitUntil: 'domcontentloaded' });

      const search = page.getByRole('textbox');
      await expect(search).toBeVisible();
      const styles = await search.evaluate((input) => {
        const computed = getComputedStyle(input);
        return {
          radius: computed.borderTopLeftRadius,
          token: computed.getPropertyValue('--radius-md').trim(),
        };
      });

      expect(styles.radius).toBe(styles.token);
    });
  }
});
