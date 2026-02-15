const { test, expect } = require('@playwright/test');

test.describe('Portfolio UI', () => {
  test('should load Korean homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/이재철/);
  });

  test('should load English homepage', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Jaecheol Lee/);
  });

  test('should have terminal input', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#terminal-input')).toBeVisible();
  });

  test('should execute help command', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cliInput = page.locator('#terminal-input');
    await cliInput.fill('help');
    await cliInput.press('Enter');
    await page.waitForTimeout(500);
    await expect(page.locator('#cli-output')).toContainText('Available commands');
  });
});
