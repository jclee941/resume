// @ts-check
const { test, expect } = require('@playwright/test');

const projectData = require('../../apps/portfolio/data.json');

// The portfolio renders project cards sorted by displayOrder (see
// apps/portfolio/lib/cards/projects.js), not by data.json array order.
// Mirror that ordering so positional assertions match the rendered DOM.
const orderedProjects = [...projectData.projects].sort(
  (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
);

const EXPECTED = {
  RESUMES: projectData.resume.length,
  PROJECTS: projectData.projects.length,
  NAV_LINKS: 4,
  CONTACT_LINKS: 5,
};

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {unknown[]} candidates
 * @returns {RegExp}
 */
function buildAnyTextPattern(candidates) {
  const values = candidates.filter(Boolean).map((item) => escapeRegExp(String(item)));
  if (values.length === 0) return /.+/;
  return new RegExp(values.join('|'));
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display logo', async ({ page }) => {
    const logo = page.locator('.nav-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveText('~/jclee');
  });

  test('should have all navigation links', async ({ page }) => {
    const navLinks = page.locator('.nav-links a');
    await expect(navLinks).toHaveCount(EXPECTED.NAV_LINKS);

    await expect(navLinks.nth(0)).toHaveAttribute('href', '#about');
    await expect(navLinks.nth(1)).toHaveAttribute('href', '#resume');
    await expect(navLinks.nth(2)).toHaveAttribute('href', '#projects');
    await expect(navLinks.nth(3)).toHaveAttribute('href', '#contact');
  });

  test('navigation links should scroll to sections', async ({ page }) => {
    await page.click('a[href="#resume"]');
    const resumeSection = page.locator('#resume');
    await expect(resumeSection).toBeInViewport({ timeout: 2000 });

    await page.click('a[href="#projects"]');
    const projectsSection = page.locator('#projects');
    await expect(projectsSection).toBeInViewport({ timeout: 2000 });

    await page.click('a[href="#contact"]');
    const contactSection = page.locator('#contact');
    await expect(contactSection).toBeInViewport({ timeout: 2000 });
  });
});

test.describe('Hero Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display hero title', async ({ page }) => {
    const title = page.locator('.hero-title');
    await expect(title).toBeVisible();
    const heroText = await title.textContent();
    const heroPattern = buildAnyTextPattern(['이재철', 'Jaecheol Lee']);
    expect(heroText || '').toMatch(heroPattern);
  });

  test('should display clean hero positioning copy without command output chrome', async ({
    page,
  }) => {
    const title = page.locator('.hero-title');
    await expect(title).toBeVisible();

    const heroCopy = page.locator('.hero-positioning, .hero-subtitle, .hero-tagline').first();
    await expect(heroCopy).toBeVisible();
    const text = await heroCopy.textContent();
    expect(text?.trim().length).toBeGreaterThan(10);
    await expect(page.locator('.cmd-output')).toHaveCount(0);
  });
});

test.describe('Resume Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have section header', async ({ page }) => {
    const heading = page.locator('#resume').getByRole('heading').first();
    await expect(heading).toBeVisible();
    await expect(page.locator('.section-cmd')).toHaveCount(0);
  });

  test('should display all resume items', async ({ page }) => {
    // Timeline JS replaces the server-rendered <ul.resume-list><li> with a
    // <div.incident-timeline.resume-list> of <article role="listitem"> nodes.
    // Use the semantic listitem role so the assertion survives that transform.
    const resumeItems = page.locator('#resume .resume-list [role="listitem"]');
    await expect(resumeItems).toHaveCount(EXPECTED.RESUMES);
  });

  test('should verify resume item content', async ({ page }) => {
    for (let i = 0; i < Math.min(3, projectData.resume.length); i++) {
      const resume = projectData.resume[i];
      const item = page.locator('#resume .resume-list [role="listitem"]').nth(i);
      await expect(item).toBeVisible();
      const text = await item.textContent();
      expect(text || '').toContain(resume.period);
      const heading = item.locator('h3, h4').first();
      await expect(heading).toBeVisible();
    }
  });
});

test.describe('Projects Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have section header', async ({ page }) => {
    const heading = page.locator('#projects').getByRole('heading').first();
    await expect(heading).toBeVisible();
    await expect(page.locator('.section-cmd')).toHaveCount(0);
  });

  test('should display all project cards', async ({ page }) => {
    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(EXPECTED.PROJECTS);
  });

  test('should verify each project card content', async ({ page }) => {
    const moreButton = page.locator('.project-more-btn');
    if ((await moreButton.count()) > 0) {
      await moreButton.click();
    }

    for (let i = 0; i < orderedProjects.length; i++) {
      const project = orderedProjects[i];
      const card = page.locator('#projects li.project-item').nth(i);

      await expect(card).toBeVisible();

      const title = card.locator('.project-link-title, .project-title-text');
      const text = await title.textContent();
      const pattern = new RegExp(escapeRegExp(project.title), 'i');
      expect(text || '').toMatch(pattern);
    }
  });

  test('should have valid project links', async ({ page }) => {
    for (let i = 0; i < orderedProjects.length; i++) {
      const project = orderedProjects[i];
      const card = page.locator('#projects li.project-item').nth(i);

      if (project.liveUrl) {
        const liveLink = card.locator('.project-link-title[href]');
        const linkCount = await liveLink.count();
        if (linkCount > 0) {
          const href = await liveLink.first().getAttribute('href');
          expect(href).toBe(project.liveUrl);
        }
      }

      if (project.repoUrl) {
        const repoLink = card.locator('.project-link-github');
        const linkCount = await repoLink.count();
        if (linkCount > 0) {
          const href = await repoLink.first().getAttribute('href');
          expect(href).toBe(project.repoUrl);
        }
      }
    }
  });
});
