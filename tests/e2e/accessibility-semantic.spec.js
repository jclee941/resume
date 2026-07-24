// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Semantic HTML', () => {
  test('should use semantic heading hierarchy', async ({ page }) => {
    await page.goto('/');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h1 = page.locator('h1');
    await expect(h1).toHaveClass(/hero-title/);

    const sectionTitles = page.locator('.section-title');
    const count = await sectionTitles.count();

    for (let i = 0; i < count; i++) {
      const tagName = await sectionTitles.nth(i).evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe('h2');
    }
  });

  test('should use semantic section elements', async ({ page }) => {
    await page.goto('/');

    const sections = page.locator('section');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(4);

    const nav = page.locator('nav');
    expect(await nav.count()).toBeGreaterThan(0);
    await expect(nav.first()).toBeVisible();

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('lang attribute should be set', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(['ko', 'en']).toContain(lang);
  });
});

test.describe('Screen Reader Text', () => {
  test('should have screen reader only text where needed', async ({ page }) => {
    await page.goto('/');

    const srOnly = page.locator('.theme-toggle .sr-only');
    if ((await srOnly.count()) === 0) {
      await expect(page.locator('.skip-link')).toBeVisible();
      return;
    }

    await expect(srOnly).toHaveText(/Toggle between light and dark mode/);

    const display = await srOnly.evaluate((el) => window.getComputedStyle(el).position);
    expect(display).toBe('absolute');
  });
});
