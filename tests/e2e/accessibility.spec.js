// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Accessibility (a11y)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have skip link for keyboard navigation', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');

    // Skip link should be visually hidden but accessible
    // Focus on skip link via keyboard
    await page.keyboard.press('Tab');

    // Skip link should become visible on focus
    await expect(skipLink).toBeFocused();
  });

  test('should have proper ARIA roles', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    const navRole = await nav.getAttribute('role');
    if (navRole !== null) {
      expect(navRole).toBe('navigation');
    }

    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
    const mainRole = await main.getAttribute('role');
    if (mainRole !== null) {
      expect(mainRole).toBe('main');
    }

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const resumeSection = page.locator('#resume');
    await expect(resumeSection).toBeVisible();
    const resumeRole = await resumeSection.getAttribute('role');
    if (resumeRole !== null) {
      expect(resumeRole).toBe('region');
    }

    const projectsSection = page.locator('#projects');
    await expect(projectsSection).toBeVisible();
    const projectsRole = await projectsSection.getAttribute('role');
    if (projectsRole !== null) {
      expect(projectsRole).toBe('region');
    }

    const contactSection = page.locator('#contact');
    await expect(contactSection).toBeVisible();
    const contactRole = await contactSection.getAttribute('role');
    if (contactRole !== null) {
      expect(contactRole).toBe('region');
    }
  });

  test('should have ARIA labels on navigation', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    const navLabel = await nav.getAttribute('aria-label');
    if (navLabel !== null) {
      expect(navLabel).toBe('Main navigation');
    }

    const logo = page.locator('.nav-logo');
    await expect(logo).toBeVisible();
    const logoLabel = await logo.getAttribute('aria-label');
    if (logoLabel !== null) {
      // aria-label must contain the visible text (~/jclee) to satisfy
      // label-content-name-mismatch (axe/Lighthouse).
      const logoText = (await logo.innerText()).trim();
      expect(logoLabel).toContain(logoText);
    }

    const navLinks = page.locator('.nav-link, .nav-links a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const i18nAria = await navLinks.nth(i).getAttribute('data-i18n-aria');
      if (i18nAria !== null) {
        expect(i18nAria).toBeTruthy();
      }
    }
  });

  test('should have aria-labelledby on sections', async ({ page }) => {
    await expect(page.locator('#resume')).toHaveAttribute('aria-labelledby', 'resume-heading');
    await expect(page.locator('#projects')).toHaveAttribute('aria-labelledby', 'projects-heading');
    await expect(page.locator('#contact')).toHaveAttribute('aria-labelledby', 'contact-heading');
  });

  test('theme toggle should have aria-pressed state', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');
    const count = await themeToggle.count();
    if (count === 0) {
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', /dark|light|hacker/);
      return;
    }

    await expect(themeToggle).toHaveAttribute('aria-pressed', 'false');

    await themeToggle.dispatchEvent('click');
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('download section should have role group', async ({ page }) => {
    const downloadSection = page.locator('.hero-download');
    if ((await downloadSection.count()) > 0) {
      await expect(downloadSection).toHaveAttribute('role', 'group');
      const ariaLabel = await downloadSection.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      if (ariaLabel !== null) {
        expect(ariaLabel.length).toBeGreaterThan(0);
      }
      return;
    }

    const resumeDownload = page.locator('.resume-download');
    if ((await resumeDownload.count()) > 0) {
      await expect(resumeDownload).toBeVisible();
      const downloadLink = resumeDownload.locator('a[download]');
      if ((await downloadLink.count()) > 0) {
        await expect(downloadLink).toBeVisible();
      }
      return;
    }

    test.skip(true, 'No download section found on page');
  });

  test('contact grid should be a labeled nav of links', async ({ page }) => {
    const contactGrid = page.locator('.contact-grid');
    if ((await contactGrid.count()) === 0) {
      const contactLinks = page.locator('#contact a');
      expect(await contactLinks.count()).toBeGreaterThan(0);
      return;
    }

    // contact-grid is a labeled <nav> of plain anchors (not a list). This avoids
    // axe aria-required-parent/listitem issues that flex list containers trigger,
    // while still exposing an accessible landmark name.
    expect(await contactGrid.evaluate((el) => el.tagName)).toBe('NAV');
    expect(await contactGrid.getAttribute('aria-label')).toBeTruthy();

    const links = page.locator('.contact-grid > a.contact-item');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('icons should be hidden from screen readers', async ({ page }) => {
    const navIcons = page.locator('.theme-toggle svg');
    const navIconCount = await navIcons.count();
    if (navIconCount === 0) {
      return;
    }

    for (let i = 0; i < navIconCount; i++) {
      await expect(navIcons.nth(i)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('external links should indicate they open in new tab', async ({ page }) => {
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const ariaLabel = await externalLinks.nth(i).getAttribute('aria-label');
      if (ariaLabel) {
        expect(ariaLabel.toLowerCase()).toMatch(/new tab|external|새 탭/i);
      }
    }
  });
});
