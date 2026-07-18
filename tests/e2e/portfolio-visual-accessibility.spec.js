const { test, expect } = require('@playwright/test');
const {
  collectCjkWrappingViolations,
  collectGeometryViolations,
  manifest,
  openPortfolio,
} = require('./fixtures/portfolio-qa');

async function focusFromKeyboard(page, selector) {
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press('Tab');
    const match = await page.evaluate(
      (value) =>
        document.activeElement instanceof HTMLElement && document.activeElement.matches(value),
      selector
    );
    if (match) return;
  }
  throw new Error(`keyboard focus did not reach ${selector}`);
}

test.describe('multilingual geometry, keyboard, and CJK matrix', () => {
  for (const locale of manifest.locales) {
    for (const viewport of manifest.viewports) {
      test(`${locale.id} ${viewport.id} satisfies the visual accessibility contract`, async ({
        page,
      }) => {
        await openPortfolio(page, locale, viewport);
        expect.soft(await collectGeometryViolations(page), 'geometry violations').toEqual([]);
        expect
          .soft(await collectCjkWrappingViolations(page, locale.id), 'CJK wrapping violations')
          .toEqual([]);

        const cover = page.locator('#cover-letter details');
        await expect(cover).toHaveCount(1);
        await expect(cover).not.toHaveAttribute('open', '');
        const summary = cover.locator('summary');
        await expect(summary).toHaveAccessibleName(/\S/);
        await summary.press('Enter');
        await expect(cover).toHaveAttribute('open', '');
        expect.soft(await collectGeometryViolations(page), 'expanded geometry').toEqual([]);
        expect
          .soft(await collectCjkWrappingViolations(page, locale.id), 'expanded CJK wrapping')
          .toEqual([]);
        if (viewport.width < 768) {
          await expect(page.locator('.mobile-actions')).toBeHidden();
        }

        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator('.hero-cta a:first-child').hover();
        await focusFromKeyboard(page, '.hero-cta a:first-child');
        const focusStyle = await page.locator('.hero-cta a:first-child').evaluate((element) => {
          const style = getComputedStyle(element);
          const rgb = (value) =>
            value
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
          const luminance = (color) =>
            color
              .map((value) => value / 255)
              .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
              .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const foreground = luminance(rgb(style.color));
          const background = luminance(rgb(style.backgroundColor));
          return {
            outline: style.outlineStyle,
            outlineWidth: Number.parseFloat(style.outlineWidth),
            contrast:
              (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
          };
        });
        expect(
          focusStyle.outline !== 'none' && focusStyle.outlineWidth >= 2,
          `focus style: ${JSON.stringify(focusStyle)}`
        ).toBe(true);
        expect(
          focusStyle.contrast,
          `focus contrast: ${JSON.stringify(focusStyle)}`
        ).toBeGreaterThanOrEqual(4.5);

        const capability = page.locator('[data-capability-control]').first();
        await expect(capability).toBeVisible();
        await capability.press('Enter');
        await expect(capability).toHaveAttribute('aria-pressed', 'true');
      });
    }
  }

  test('the geometry gate rejects injected horizontal overflow', async ({ page }) => {
    await openPortfolio(page, manifest.locales[0], manifest.viewports[0]);
    await page.evaluate(() => {
      const overflow = document.createElement('div');
      overflow.dataset.qaInjectedOverflow = 'true';
      overflow.style.width = '5000px';
      overflow.style.height = '1px';
      document.querySelector('main').append(overflow);
    });
    const failures = await collectGeometryViolations(page);
    expect(
      failures.some(
        (failure) => failure.startsWith('horizontal-overflow:') || failure.startsWith('clipped:')
      )
    ).toBe(true);
  });
});
