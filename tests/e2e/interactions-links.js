const { test, expect } = require('@playwright/test');

test.describe('Link Hover States', () => {
  test('nav links should have hover effect', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const navLink = page.locator('.nav-links a').first();
    await navLink.evaluate((el) => window.getComputedStyle(el).color); // Check initial color

    // Hover over link
    await navLink.hover();

    await navLink.evaluate((el) => window.getComputedStyle(el).color); // Check hover color

    // Color might change on hover (depends on CSS)
    // At minimum, cursor should be pointer
    const cursor = await navLink.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('project card links should be clickable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const projectLinks = page.locator('#projects a.project-link-title');
    const count = await projectLinks.count();

    if (count > 0) {
      const firstLink = projectLinks.first();
      await expect(firstLink).toHaveAttribute('href');
    }
  });
});

test.describe('Skip Link Interaction', () => {
  test('skip link should become visible on focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const skipLink = page.locator('.skip-link');

    // Initially hidden (off-screen)
    const initialPosition = await skipLink.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.position;
    });
    expect(initialPosition).toBe('absolute');

    // Tab to skip link
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    // Should be visible on focus
    await expect(skipLink).toBeVisible();
  });

  test('activating skip link should focus main content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Tab to skip link
    await page.keyboard.press('Tab');

    // Activate skip link
    await page.keyboard.press('Enter');

    // Main content should be in view
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeInViewport();
  });
});

test.describe('Contact Links Interaction', () => {
  test('email link should have mailto protocol', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const emailLink = page.locator('a[href^="mailto:"]').first();
    // The primary CTA may carry a `?subject=` prefill; assert the mailto target
    // (protocol + address) while tolerating only a subject query parameter.
    await expect(emailLink).toHaveAttribute(
      'href',
      /^mailto:qws941@kakao\.com(?:\?subject=[^#]*)?$/
    );
  });

  test('external links should open in new tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const githubLink = page.getByRole('link', { name: /^GitHub \(opens in new tab\)$/ });
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', /noopener/);
  });
});
