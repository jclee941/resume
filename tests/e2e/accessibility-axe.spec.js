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
    await page.goto('/', { waitUntil: 'domcontentloaded' });
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

  test('skill radar cards should not use disallowed interactive roles', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#skill-radar-grid .skill-domain-card', { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .include('#skill-radar-grid')
      .withRules(['aria-allowed-role'])
      .analyze();
    const skillRadarViolations = results.violations
      .filter((violation) => violation.id === 'aria-allowed-role')
      .flatMap((violation) =>
        violation.nodes.map((node) => ({
          id: violation.id,
          impact: violation.impact,
          target: node.target,
          failureSummary: node.failureSummary,
        }))
      );

    expect(
      skillRadarViolations,
      `skill radar aria-allowed-role violations: ${JSON.stringify(skillRadarViolations, null, 2)}`
    ).toEqual([]);

    const firstCard = page.locator('#skill-radar-grid .skill-domain-card').first();
    await expect(firstCard).toHaveAccessibleName(/^[^:]+: .+, \d+ skills$/);
    await expect(firstCard).not.toHaveAccessibleName(/Evidence|Recent proof|Related project/i);
    await expect(firstCard).toHaveAttribute('aria-expanded', 'false');
    await firstCard.click();
    await expect(firstCard).toHaveAttribute('aria-expanded', 'true');
    await firstCard.press('Enter');
    await expect(firstCard).toHaveAttribute('aria-expanded', 'false');
    await firstCard.press(' ');
    await expect(firstCard).toHaveAttribute('aria-expanded', 'true');
  });

  test('timeline accessibility should not use disallowed ARIA roles', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#resume .timeline-node', { timeout: 15000 });

    const results = await new AxeBuilder({ page }).withRules(['aria-allowed-role']).analyze();
    const timelineViolations = results.violations
      .filter((violation) => violation.id === 'aria-allowed-role')
      .flatMap((violation) =>
        violation.nodes
          .filter((node) => node.target.some((target) => target.includes('timeline-node')))
          .map((node) => ({
            id: violation.id,
            impact: violation.impact,
            target: node.target,
            failureSummary: node.failureSummary,
          }))
      );

    expect(
      timelineViolations,
      `timeline aria-allowed-role violations: ${JSON.stringify(timelineViolations, null, 2)}`
    ).toEqual([]);
  });
});
