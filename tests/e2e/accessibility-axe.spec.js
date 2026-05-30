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

  test('homepage should have zero serious or critical WCAG violations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded'
});
    // Wait for JS-rendered widgets (skill radar cards, command palette) to mount.
    await page.waitForSelector('#skill-radar-grid .skill-domain-card', { timeout: 15000 });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    const summary = blocking.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`);
    expect(summary, `serious/critical violations: ${JSON.stringify(summary, null, 2)}`).toEqual([]);
  });

  test('homepage should not have aria/list/contrast rule violations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#skill-radar-grid .skill-domain-card', { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .withRules([
        'aria-allowed-attr',
        'aria-required-children',
        'aria-required-parent',
        'list',
        'listitem',
        'color-contrast',
      ])
      .analyze();

    const ids = results.violations.map((v) => `${v.id} x${v.nodes.length}`);
    expect(ids, `violations: ${JSON.stringify(ids, null, 2)}`).toEqual([]);
  });
});
