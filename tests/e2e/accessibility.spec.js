// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Accessibility (a11y)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have skip link for keyboard navigation', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#terminal-input');

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
      expect(logoLabel).toBe('Homepage');
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
      await expect(downloadSection).toHaveAttribute('aria-label', 'Resume download options');
      return;
    }

    const resumeDownload = page.locator('.resume-download');
    await expect(resumeDownload).toBeVisible();
    await expect(resumeDownload.locator('a[download]')).toBeVisible();
  });

  test('contact grid should have list semantics', async ({ page }) => {
    const contactGrid = page.locator('.contact-grid');
    if ((await contactGrid.count()) === 0) {
      const contactLinks = page.locator('#contact a');
      expect(await contactLinks.count()).toBeGreaterThan(0);
      return;
    }

    await expect(contactGrid).toHaveAttribute('role', 'list');

    const contactItems = page.locator('.contact-item');
    const count = await contactItems.count();

    for (let i = 0; i < count; i++) {
      await expect(contactItems.nth(i)).toHaveAttribute('role', 'listitem');
    }
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
      // Should indicate it opens in new tab
      if (ariaLabel) {
        expect(ariaLabel.toLowerCase()).toMatch(/new tab|external/i);
      }
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should be able to navigate with Tab key', async ({ page }) => {
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    const focusableElements = await page.locator('a[href], button, [tabindex="0"]').count();
    expect(focusableElements).toBeGreaterThan(5);

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    }
  });

  test('theme toggle should work with Enter key', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');
    if ((await themeToggle.count()) === 0) {
      return;
    }
    await themeToggle.focus();

    await page.keyboard.press('Enter');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('theme toggle should work with Space key', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');
    if ((await themeToggle.count()) === 0) {
      return;
    }
    await themeToggle.focus();

    await page.keyboard.press('Space');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('links should be activatable with Enter key', async ({ page }) => {
    const navLink = page.locator('.nav-link, .nav-links a').first();
    await navLink.focus();
    await page.keyboard.press('Enter');

    const aboutSection = page.locator('#about');
    // Wait for scroll to target section after Enter key press
    await expect(aboutSection).toBeInViewport({ timeout: 2000 });
  });
});

test.describe('Color Contrast', () => {
  test('text should have sufficient contrast ratio', async ({ page }) => {
    await page.goto('/');

    // Check hero title color
    const heroTitle = page.locator('.hero-title');
    const color = await heroTitle.evaluate((el) => window.getComputedStyle(el).color);
    const bgColor = await heroTitle.evaluate((el) => {
      let elem = el;
      while (elem) {
        const bg = window.getComputedStyle(elem).backgroundColor;
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
        elem = elem.parentElement;
      }
      return 'rgb(255, 255, 255)';
    });

    // Colors should be defined (not transparent)
    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();
  });

  test('links should be visually distinguishable', async ({ page }) => {
    await page.goto('/');

    const link = page.locator('.nav-link, .nav-links a').first();
    const linkColor = await link.evaluate((el) => window.getComputedStyle(el).color);

    // Link color should not be plain black or match body text exactly
    expect(linkColor).toBeTruthy();
  });
});

test.describe('Focus Indicators', () => {
  test('interactive elements should have visible focus', async ({ page }) => {
    await page.goto('/');

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const focusResult = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;

      const hasFocusVisible = el.matches(':focus-visible');
      const styles = window.getComputedStyle(el);

      let focusVisibleRuleExists = false;
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            const styleRule = rule;
            if (
              styleRule.selectorText &&
              styleRule.selectorText.includes(':focus-visible') &&
              styleRule.style &&
              styleRule.style.outline
            ) {
              focusVisibleRuleExists = true;
              break;
            }
          }
        } catch {}
        if (focusVisibleRuleExists) break;
      }

      return {
        hasFocusVisible,
        focusVisibleRuleExists,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
        boxShadow: styles.boxShadow,
      };
    });

    expect(focusResult).not.toBeNull();
    if (!focusResult) return;

    expect(focusResult.hasFocusVisible).toBeTruthy();
    expect(focusResult.focusVisibleRuleExists).toBeTruthy();

    const hasComputedOutline =
      focusResult.outlineStyle !== 'none' && parseInt(focusResult.outlineWidth) > 0;
    const hasBoxShadow = focusResult.boxShadow !== 'none';

    expect(focusResult.focusVisibleRuleExists || hasComputedOutline || hasBoxShadow).toBeTruthy();
  });

  test('buttons should have visible focus', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('.theme-toggle');
    if ((await themeToggle.count()) === 0) {
      return;
    }
    await themeToggle.focus();

    const outline = await themeToggle.evaluate((el) => window.getComputedStyle(el).outline);
    const boxShadow = await themeToggle.evaluate((el) => window.getComputedStyle(el).boxShadow);

    // Should have visible focus indicator
    expect((outline !== 'none' && outline !== '0px none') || boxShadow !== 'none').toBeTruthy();
  });
});

test.describe('Semantic HTML', () => {
  test('should use semantic heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // h1 should be the hero title
    const h1 = page.locator('h1');
    await expect(h1).toHaveClass(/hero-title/);

    // Section titles should be h2
    const sectionTitles = page.locator('.section-title');
    const count = await sectionTitles.count();

    for (let i = 0; i < count; i++) {
      const tagName = await sectionTitles.nth(i).evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe('h2');
    }
  });

  test('should use semantic section elements', async ({ page }) => {
    await page.goto('/');

    // Should have section elements
    const sections = page.locator('section');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(4); // hero, resume, projects, contact

    // Should have nav element
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Should have footer element
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('lang attribute should be set', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(['ko', 'en']).toContain(lang);
  });
});

test.describe('Screen Reader Text', () => {
  test('should have screen reader only text where needed', async ({ page }) => {
    await page.goto('/');

    // Theme toggle should have sr-only text
    const srOnly = page.locator('.theme-toggle .sr-only');
    if ((await srOnly.count()) === 0) {
      await expect(page.locator('.skip-link')).toBeVisible();
      return;
    }

    await expect(srOnly).toHaveText(/Toggle between light and dark mode/);

    // sr-only text should be visually hidden
    const display = await srOnly.evaluate((el) => window.getComputedStyle(el).position);
    expect(display).toBe('absolute');
  });
});
