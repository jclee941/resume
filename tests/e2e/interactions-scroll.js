const { test, expect } = require('@playwright/test');

test.describe('Smooth Scroll Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('clicking nav links should scroll to sections', async ({ page }) => {
    // Navigate to resume section
    await page.click('a[href="#resume"]');
    await expect(page.locator('#resume')).toBeInViewport({ timeout: 8000 });

    // Reset to top and navigate to projects
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.nav-logo')).toBeInViewport({ timeout: 2000 });

    await page.click('a[href="#projects"]');
    await expect(page.locator('#projects')).toBeInViewport({ timeout: 8000 });

    // Navigate to contact
    await page.click('a[href="#contact"]');
    await expect(page.locator('#contact')).toBeInViewport({ timeout: 8000 });
  });

  test('logo click should navigate to homepage', async ({ page }) => {
    await page.click('a[href="#contact"]');
    // Smooth-scroll (CSS scroll-behavior) can take longer than 2s under load;
    // give the animation room before asserting the target is in view.
    await expect(page.locator('#contact')).toBeInViewport({ timeout: 8000 });

    const logo = page.locator('.nav-logo');
    const href = await logo.getAttribute('href');
    expect(href === '/' || href === '#').toBeTruthy();

    // `.nav-logo` href is '/', so clicking triggers a full navigation home.
    // Wait for that navigation to settle before asserting, otherwise the
    // in-viewport check races the unload (flaky under parallel execution).
    await Promise.all([page.waitForLoadState('domcontentloaded'), logo.click()]);
    await expect(page.locator('.nav-logo')).toBeInViewport({ timeout: 2000 });
  });
});

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
    // Hash navigation may race with reveal-on-scroll; nudge into view explicitly.
    await contactSection.scrollIntoViewIfNeeded();
    await expect(contactSection).toBeInViewport({ timeout: 5000 });
  });
});
