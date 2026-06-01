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

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} command
 */
async function runCliCommand(page, command) {
  const cliInput = page.locator('#terminal-input');
  await cliInput.fill(command);
  await cliInput.press('Enter');
  return page.locator('#cli-output');
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

  test('should display terminal command output', async ({ page }) => {
    const cmdOutput = page.locator('.cmd-output').first();
    await expect(cmdOutput).toBeVisible();
    const text = await cmdOutput.textContent();
    expect(text?.length).toBeGreaterThan(10);
  });
});

test.describe('Resume Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have section header', async ({ page }) => {
    const sectionCmd = page.locator('#resume .section-cmd');
    await expect(sectionCmd).toBeVisible();
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
    const sectionCmd = page.locator('#projects .section-cmd');
    await expect(sectionCmd).toBeVisible();
  });

  test('should display all project cards', async ({ page }) => {
    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(EXPECTED.PROJECTS);
  });

  test('should verify each project card content', async ({ page }) => {
    for (let i = 0; i < orderedProjects.length; i++) {
      const project = orderedProjects[i];
      const card = page.locator('#projects li.project-item').nth(i);

      await expect(card).toBeVisible();

      const title = card.locator('.project-link-title');
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

test.describe('Case Studies Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render exactly four architecture case-study cards', async ({ page }) => {
    const cards = page.locator('#case-studies .project-card[role="listitem"]');
    await expect(cards).toHaveCount(4);
  });

  test('case-study card opens an architecture deep-dive overlay', async ({ page }) => {
    const firstCard = page.locator('#case-studies .project-card[role="listitem"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    const overlay = page.locator('.deep-dive-overlay[role="dialog"]');
    await expect(overlay).toBeVisible();
  });
});

test.describe('Contact Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have section header', async ({ page }) => {
    const sectionCmd = page.locator('#contact .section-cmd');
    await expect(sectionCmd).toBeVisible();
  });

  test('should display contact links', async ({ page }) => {
    const visibleContactLinkCount = await page.locator('#contact').evaluate((section) => {
      return Array.from(section.querySelectorAll('a[href]')).filter(
        (link) => link.getClientRects().length > 0
      ).length;
    });

    expect(visibleContactLinkCount).toBeGreaterThan(0);
  });

  test('should have valid email link', async ({ page }) => {
    const emailLink = page.locator('#contact a[href^="mailto:"]').last();
    const href = await emailLink.getAttribute('href');
    expect(href).toMatch(/^mailto:/);
  });

  test('should have valid GitHub link', async ({ page }) => {
    const githubLink = page.locator('#contact a[href*="github.com"]').last();
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });
});

test.describe('Footer', () => {
  test('should display footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

test.describe('CLI Terminal', () => {
  test('should display CLI container', async ({ page }) => {
    await page.goto('/');
    const cliContainer = page.locator('#cli-container');
    await expect(cliContainer).toBeVisible();
  });

  test('should have input field', async ({ page }) => {
    await page.goto('/');
    const cliInput = page.locator('#terminal-input');
    await expect(cliInput).toBeVisible();
    await expect(cliInput).toBeEditable();
  });

  test('help command should show available commands', async ({ page }) => {
    await page.goto('/');
    const cliInput = page.locator('#terminal-input');
    await cliInput.fill('help');
    await cliInput.press('Enter');

    const cliOutput = page.locator('#cli-container');
    await expect(cliOutput).toContainText('Available commands');
  });
});

test.describe('CLI Core Commands', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('help command keeps core command list discoverable', async ({ page }) => {
    const cliOutput = await runCliCommand(page, 'help');
    await expect(cliOutput).toContainText('Available commands');
    await expect(cliOutput).toContainText('about');
    await expect(cliOutput).toContainText('clear');
  });

  test('unsupported single-word command returns not found message', async ({ page }) => {
    const cliOutput = await runCliCommand(page, 'foobar');
    await expect(cliOutput).toContainText('command not allowed: foobar');
  });

  test('unsupported multi-word command reports first token', async ({ page }) => {
    const cliOutput = await runCliCommand(page, 'xyzzy dark');
    await expect(cliOutput).toContainText('command not allowed: xyzzy');
  });
});

test.describe('External Links Validation', () => {
  test('all external links should have proper attributes', async ({ page }) => {
    await page.goto('/');

    const externalLinks = page.locator('a[href^="http"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const isDownload = await link.getAttribute('download');
      if (isDownload !== null) continue;

      const target = await link.getAttribute('target');
      const rel = await link.getAttribute('rel');

      if (target === '_blank') {
        expect(rel).toMatch(/noopener/);
      }
    }
  });
});

test.describe('Data Consistency', () => {
  test('resume count should match data.json', async ({ page }) => {
    await page.goto('/');
    // Timeline JS renders 6 career <article role="listitem"> nodes (not <li>).
    const resumeItems = page.locator('#resume .resume-list [role="listitem"]');
    await expect(resumeItems).toHaveCount(projectData.resume.length);
  });

  test('project count should match data.json', async ({ page }) => {
    await page.goto('/');
    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(projectData.projects.length);
  });

  test('project titles should match data.json order', async ({ page }) => {
    await page.goto('/');

    for (let i = 0; i < orderedProjects.length; i++) {
      const expected = new RegExp(escapeRegExp(orderedProjects[i].title), 'i');
      const actual = page
        .locator('#projects li.project-item')
        .nth(i)
        .locator('.project-link-title');
      await expect(actual).toContainText(expected);
    }
  });
});
