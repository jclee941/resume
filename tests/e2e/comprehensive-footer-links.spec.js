// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Footer', () => {
  test('should display footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

test.describe('CLI Terminal Removed', () => {
  test('should not expose legacy CLI terminal UI or command registry', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#cli-container')).toHaveCount(0);
    await expect(page.locator('#terminal-input')).toHaveCount(0);
    await expect(page.locator('#cli-output')).toHaveCount(0);
    expect(await page.evaluate(() => 'terminalCommands' in window)).toBe(false);
  });
});

test.describe('External Links Validation', () => {
  test('all external links should have proper attributes', async ({ page }) => {
    await page.goto('/');

    const externalLinks = page.locator('a[href^="http"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const isDownload = await link.getAttribute('download');
      if (isDownload !== null) continue;

      const target = await link.getAttribute('target');
      const rel = await link.getAttribute('rel');

      if (target === '_blank') {
        expect(rel).toMatch(/noopener/);
      }
    }
  });
});
