const { test, expect } = require('@playwright/test');

test.describe('Visual Regression', () => {
  test('Korean homepage visual snapshot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('ko-homepage.png', { maxDiffPixels: 100 });
  });

  test('English homepage visual snapshot', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('en-homepage.png', { maxDiffPixels: 100 });
  });
});
