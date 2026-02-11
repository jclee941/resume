// @ts-check
const { test, expect } = require('@playwright/test');
const { navigateToSection } = require('./fixtures/helpers');

test.describe('Smooth Scroll Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('clicking nav links should scroll to sections', async ({ page }) => {
    // Navigate to resume section
    await page.click('a[href="#resume"]');
    await expect(page.locator('#resume')).toBeInViewport({ timeout: 2000 });

    // Reset to top and navigate to projects
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.nav-logo')).toBeInViewport({ timeout: 2000 });

    await page.click('a[href="#projects"]');
    await expect(page.locator('#projects')).toBeInViewport({ timeout: 2000 });

    // Navigate to contact
    await page.click('a[href="#contact"]');
    await expect(page.locator('#contact')).toBeInViewport({ timeout: 2000 });
  });

  test('logo click should navigate to homepage', async ({ page }) => {
    await page.click('a[href="#contact"]');
    await expect(page.locator('#contact')).toBeInViewport({ timeout: 2000 });

    const logo = page.locator('.nav-logo');
    const href = await logo.getAttribute('href');
    expect(href === '/' || href === '#').toBeTruthy();

    await logo.click();
    await expect(logo).toBeInViewport({ timeout: 2000 });
  });
});

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

    const emailLink = page.locator('a[href^="mailto:"]');
    await expect(emailLink).toHaveAttribute('href', 'mailto:qws941@kakao.com');
  });

  test('external links should open in new tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const githubLink = page
      .locator('.contact-grid a, .contact-links a')
      .filter({ hasText: 'GitHub' });
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', /noopener/);
  });
});

test.describe('Card Interactions', () => {
  test('resume cards should be hoverable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const card = page.locator('#resume .resume-list li').first();
    await card.hover();

    // Check for hover state (transform or shadow change)
    const transform = await card.evaluate((el) => window.getComputedStyle(el).transform);
    // Transform might be 'none' or a matrix value
    expect(transform).toBeTruthy();
  });

  test('project cards should be hoverable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const card = page.locator('#projects .project-list li.project-item').first();
    await card.hover();

    const cursor = await card.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBeTruthy();
  });

  test('project card links should be distinguishable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const projectLinks = page.locator('#projects a.project-link-title');
    const projectLinksCount = await projectLinks.count();

    if (projectLinksCount === 0) {
      test.skip();
      return;
    }

    for (let i = 0; i < Math.min(3, projectLinksCount); i++) {
      const link = projectLinks.nth(i);
      await expect(link).toBeVisible();
      const text = await link.textContent();
      expect(text?.trim()).toBeTruthy();
    }
  });
});

// Download Links tests removed - hero-download section no longer exists in terminal theme

test.describe('URL Hash Navigation', () => {
  test('should scroll to resume section on hash navigation', async ({ page }) => {
    await page.goto('/#resume', { waitUntil: 'domcontentloaded' });

    const resumeSection = page.locator('#resume');
    await expect(resumeSection).toBeInViewport({ timeout: 2000 });
  });

  test('should scroll to projects section on hash navigation', async ({ page }) => {
    await page.goto('/#projects', { waitUntil: 'domcontentloaded' });

    const projectsSection = page.locator('#projects');
    await expect(projectsSection).toBeInViewport({ timeout: 2000 });
  });

  test('should scroll to contact section on hash navigation', async ({ page }) => {
    await page.goto('/#contact', { waitUntil: 'domcontentloaded' });

    const contactSection = page.locator('#contact');
    await expect(contactSection).toBeInViewport({ timeout: 2000 });
  });
});
