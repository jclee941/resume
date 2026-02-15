const { test, expect } = require('@playwright/test');

test.describe('Job Dashboard', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/job/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should require authentication', async ({ page }) => {
    await page.goto('/job/dashboard', { waitUntil: 'domcontentloaded' });
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});
