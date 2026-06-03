// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Terminal CLI Removed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('does not render legacy CLI container, input, or output', async ({ page }) => {
    await expect(page.locator('#cli-container')).toHaveCount(0);
    await expect(page.locator('#terminal-input')).toHaveCount(0);
    await expect(page.locator('#cli-output')).toHaveCount(0);
  });

  test('does not expose the legacy terminal command registry', async ({ page }) => {
    expect(await page.evaluate(() => 'terminalCommands' in window)).toBe(false);
  });

  test('does not render terminal window chrome', async ({ page }) => {
    await expect(page.locator('.terminal-window')).toHaveCount(0);
    await expect(page.locator('.terminal-titlebar')).toHaveCount(0);
  });

  test('has skip link for accessibility', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});
