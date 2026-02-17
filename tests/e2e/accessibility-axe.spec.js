// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Accessibility - axe-core WCAG 2.1 AA', () => {
  test('homepage should have no critical violations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('job dashboard should have no critical violations when available', async ({
    page,
    request,
  }) => {
    const response = await request.get('/job/dashboard');
    const body = await response.text();

    test.skip(
      !response.ok() || !body || body.trim().length === 0,
      'Job dashboard not available in current test environment'
    );

    await page.goto('/job/dashboard', { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('homepage should pass key accessibility rules', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .withRules(['color-contrast', 'image-alt', 'label', 'link-name'])
      .analyze();

    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);
  });
});
