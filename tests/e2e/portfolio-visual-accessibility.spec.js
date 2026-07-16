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

        await page.evaluate(() => window.scrollTo(0, 0));
        await focusFromKeyboard(page, '.hero-cta a:first-child');
        const focusStyle = await page.locator('.hero-cta a:first-child').evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            outline: style.outlineStyle,
            outlineWidth: Number.parseFloat(style.outlineWidth),
          };
        });
        expect(
          focusStyle.outline !== 'none' && focusStyle.outlineWidth >= 2,
          `focus style: ${JSON.stringify(focusStyle)}`
        ).toBe(true);

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
