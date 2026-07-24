// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should be able to navigate with Tab key', async ({ page }) => {
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    const focusableElements = await page.locator('a[href], button, [tabindex="0"]').count();
    expect(focusableElements).toBeGreaterThan(5);

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    }
  });

  test('theme toggle should work with Enter key', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');
    if ((await themeToggle.count()) === 0) {
      return;
    }
    await themeToggle.focus();

    await page.keyboard.press('Enter');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('theme toggle should work with Space key', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');
    if ((await themeToggle.count()) === 0) {
      return;
    }
    await themeToggle.focus();

    await page.keyboard.press('Space');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('links should be activatable with Enter key', async ({ page }) => {
    const navLink = page.locator('.nav-link, .nav-links a').first();
    await navLink.focus();
    await page.keyboard.press('Enter');

    const aboutSection = page.locator('#about');
    await expect(aboutSection).toBeInViewport({ timeout: 2000 });
  });
});
