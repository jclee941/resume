const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { manifest, openPortfolio } = require('./fixtures/portfolio-qa');

function blockingViolations(results) {
  return results.violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length }));
}

async function auditPage(page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
}

test.describe('multilingual Axe matrix', () => {
  for (const locale of manifest.locales) {
    for (const viewport of manifest.viewports) {
      test(`${locale.id} ${viewport.id} has no serious or critical violations`, async ({
        page,
      }) => {
        await openPortfolio(page, locale, viewport);
        const results = await auditPage(page);
        expect(blockingViolations(results)).toEqual([]);

        const rolelessLabels = await page
          .locator('div[aria-label]:not([role])')
          .evaluateAll((nodes) => nodes.map((node) => node.outerHTML.slice(0, 180)));
        expect(rolelessLabels, 'roleless div[aria-label] elements').toEqual([]);
      });
    }
  }

  test('the blocking-violation gate rejects an injected serious violation', async ({ page }) => {
    await openPortfolio(page, manifest.locales[0], manifest.viewports[0]);
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.dataset.qaInjectedAxeViolation = 'true';
      document.body.append(button);
    });
    const results = await new AxeBuilder({ page })
      .include('[data-qa-injected-axe-violation]')
      .analyze();
    expect(blockingViolations(results)).not.toEqual([]);
  });
});
