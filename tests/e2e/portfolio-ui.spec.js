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
    await page.locator('#terminal-input').fill('help');
    await page.keyboard.press('Enter');
    await expect(page.locator('.terminal-output')).toContainText('Available commands');
  });
});
