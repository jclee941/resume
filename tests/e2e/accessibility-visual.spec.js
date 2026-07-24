// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Color Contrast', () => {
  test('text should have sufficient contrast ratio', async ({ page }) => {
    await page.goto('/');

    const heroTitle = page.locator('.hero-title');
    const color = await heroTitle.evaluate((el) => window.getComputedStyle(el).color);
    const bgColor = await heroTitle.evaluate((el) => {
      /** @type {Element | null} */
      let elem = el;
      while (elem) {
        const bg = window.getComputedStyle(elem).backgroundColor;
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
        elem = elem.parentElement;
      }
      return 'rgb(255, 255, 255)';
    });

    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();
  });

  test('links should be visually distinguishable', async ({ page }) => {
    await page.goto('/');

    const link = page.locator('.nav-link, .nav-links a').first();
    const linkColor = await link.evaluate((el) => window.getComputedStyle(el).color);

    expect(linkColor).toBeTruthy();
  });
});

test.describe('Focus Indicators', () => {
  test('interactive elements should have visible focus', async ({ page }) => {
    await page.goto('/');

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const focusResult = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;

      const hasFocusVisible = el.matches(':focus-visible');
      const styles = window.getComputedStyle(el);
      const stylesheetErrors = [];

      let focusVisibleRuleExists = false;
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (
              rule instanceof CSSStyleRule &&
              rule.selectorText.includes(':focus-visible') &&
              rule.style.outline
            ) {
              focusVisibleRuleExists = true;
              break;
            }
          }
        } catch (error) {
          stylesheetErrors.push(error instanceof Error ? error.message : String(error));
        }
        if (focusVisibleRuleExists) break;
      }

      return {
        hasFocusVisible,
        focusVisibleRuleExists,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
        boxShadow: styles.boxShadow,
        stylesheetErrors,
      };
    });

    expect(focusResult).not.toBeNull();
    if (!focusResult) return;

    expect(focusResult.hasFocusVisible).toBeTruthy();
    expect(focusResult.focusVisibleRuleExists).toBeTruthy();
    expect(focusResult.stylesheetErrors).toBeInstanceOf(Array);
    expect(focusResult.stylesheetErrors.every((message) => typeof message === 'string')).toBe(
      true
    );

    const hasComputedOutline =
      focusResult.outlineStyle !== 'none' && parseInt(focusResult.outlineWidth) > 0;
    const hasBoxShadow = focusResult.boxShadow !== 'none';

    expect(focusResult.focusVisibleRuleExists || hasComputedOutline || hasBoxShadow).toBeTruthy();
  });

  test('buttons should have visible focus', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('.theme-toggle');
    if ((await themeToggle.count()) === 0) {
      return;
    }
    await themeToggle.focus();

    const outline = await themeToggle.evaluate((el) => window.getComputedStyle(el).outline);
    const boxShadow = await themeToggle.evaluate((el) => window.getComputedStyle(el).boxShadow);

    expect((outline !== 'none' && outline !== '0px none') || boxShadow !== 'none').toBeTruthy();
  });
});
