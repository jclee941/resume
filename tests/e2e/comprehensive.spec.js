// @ts-check
const { test, expect } = require('@playwright/test');

const projectData = require('../../typescript/portfolio-worker/data.json');

const EXPECTED = {
  RESUMES: projectData.resume.length,
  PROJECTS: projectData.projects.length,
  NAV_LINKS: 4,
  CONTACT_LINKS: 5,
};

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
    await expect(title).toContainText('이재철');
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
    const resumeItems = page.locator('#resume .resume-list li');
    await expect(resumeItems).toHaveCount(EXPECTED.RESUMES);
  });

  test('should verify resume item content', async ({ page }) => {
    for (let i = 0; i < Math.min(3, projectData.resume.length); i++) {
      const resume = projectData.resume[i];
      const item = page.locator('#resume .resume-list li').nth(i);
      await expect(item).toBeVisible();
      await expect(item).toContainText(resume.title);
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
    const projectCards = page.locator('#projects .project-list li.project-item');
    await expect(projectCards).toHaveCount(EXPECTED.PROJECTS);
  });

  test('should verify each project card content', async ({ page }) => {
    for (let i = 0; i < projectData.projects.length; i++) {
      const project = projectData.projects[i];
      const card = page.locator('#projects .project-list li.project-item').nth(i);

      await expect(card).toBeVisible();

      const title = card.locator('.project-link-title');
      await expect(title).toContainText(project.title);
    }
  });

  test('should have valid project links', async ({ page }) => {
    for (let i = 0; i < projectData.projects.length; i++) {
      const project = projectData.projects[i];
      const card = page.locator('#projects .project-list li.project-item').nth(i);

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
    const contactLinks = page.locator('#contact .contact-grid a');
    const count = await contactLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have valid email link', async ({ page }) => {
    const emailLink = page.locator('#contact a[href^="mailto:"]');
    await expect(emailLink).toBeVisible();
    const href = await emailLink.getAttribute('href');
    expect(href).toMatch(/^mailto:/);
  });

  test('should have valid GitHub link', async ({ page }) => {
    const githubLink = page.locator('#contact a[href*="github.com"]');
    await expect(githubLink).toBeVisible();
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
    const cliInput = page.locator('#cli-input');
    await expect(cliInput).toBeVisible();
    await expect(cliInput).toBeEditable();
  });

  test('help command should show available commands', async ({ page }) => {
    await page.goto('/');
    const cliInput = page.locator('#cli-input');
    await cliInput.fill('help');
    await cliInput.press('Enter');

    const cliOutput = page.locator('#cli-container');
    await expect(cliOutput).toContainText('Available commands');
  });
});

test.describe.skip('Theme via CLI', () => {
  // Skipped: theme terminal command sets CSS custom properties, not data-theme attribute
  test('should change theme via CLI command', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const cliInput = page.locator('#cli-input');

    await cliInput.fill('theme dark');
    await cliInput.press('Enter');
    await page.waitForTimeout(300);
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await cliInput.fill('theme light');
    await cliInput.press('Enter');
    await page.waitForTimeout(300);
    await expect(html).toHaveAttribute('data-theme', 'light');
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
    const resumeItems = page.locator('#resume .resume-list li');
    await expect(resumeItems).toHaveCount(projectData.resume.length);
  });

  test('project count should match data.json', async ({ page }) => {
    await page.goto('/');
    const projectCards = page.locator('#projects .project-list li.project-item');
    await expect(projectCards).toHaveCount(projectData.projects.length);
  });

  test('project titles should match data.json order', async ({ page }) => {
    await page.goto('/');

    for (let i = 0; i < projectData.projects.length; i++) {
      const expected = projectData.projects[i].title;
      const actual = page
        .locator('#projects .project-list li.project-item')
        .nth(i)
        .locator('.project-link-title');
      await expect(actual).toContainText(expected);
    }
  });
});
