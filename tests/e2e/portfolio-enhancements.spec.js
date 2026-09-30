// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { projects } = require('../../apps/portfolio/data.json');
const { escapeRegExp } = require('../helpers/owner-data');
const { HERO_CONTENT, projectTitlesInDisplayOrder } = require('./fixtures/owner-copy');

const RECRUITER_DATA_URL = pathToFileURL(
  path.resolve(__dirname, '../../apps/portfolio/src/scripts/modules/recruiter-enhancements-data.js')
).href;
const EVIDENCE_LABELS = {
  ko: { path: '/', genericLabel: '근거 보기', labelFor: (title) => `${title} 근거 보기` },
  en: { path: '/en/', genericLabel: 'Open evidence', labelFor: (title) => `${title} evidence` },
  ja: {
    path: '/ja/',
    genericLabel: '根拠を見る',
    labelFor: (title) => `${title}の根拠を見る`,
  },
};

const SECURITY_ROLE_LABEL = HERO_CONTENT.ko.quickRoles.find(([id]) => id === 'security')[1];

test.describe('Portfolio recruiter enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('role quick paths focus matching evidence without removing project cards', async ({
    page,
  }) => {
    const projectCards = page.locator('#projects li.project-item');
    const initialProjectCount = await projectCards.count();
    const securityOpsChip = page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(SECURITY_ROLE_LABEL)}`),
    });

    await securityOpsChip.click();

    await expect(securityOpsChip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#projects')).toBeInViewport({ timeout: 2000 });
    await expect(page.locator('#projects li.project-item.is-role-match')).not.toHaveCount(0);
    await expect(
      page.locator('#projects li.project-item[data-role~="security"]').first()
    ).toHaveClass(/is-role-match/);
    const dimmedOpacity = await page
      .locator('#projects li.project-item.is-role-dimmed')
      .first()
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
    expect(dimmedOpacity).toBeGreaterThanOrEqual(0.75);
    await expect(projectCards).toHaveCount(initialProjectCount);
  });

  test('server-rendered role chips wait for hydration before accepting clicks', async ({
    page,
  }) => {
    let continueMainScript = () => {};
    const mainScriptBlocked = new Promise((resolve) => {
      continueMainScript = () => resolve(undefined);
    });
    await page.route('**/main.js*', async (route) => {
      await mainScriptBlocked;
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const securityChip = page.locator('.role-chip[data-role-filter="security"]');
    await expect(securityChip).toBeDisabled();

    continueMainScript();
    await expect(securityChip).toBeEnabled();
    await securityChip.click();

    await expect(securityChip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#projects li.project-item.is-role-match')).not.toHaveCount(0);
  });

  test('project evidence matrix preserves project list and project more behavior', async ({
    page,
  }) => {
    const matrix = page.locator('.project-evidence-matrix');
    await expect(matrix).toBeVisible();
    await expect(page.getByRole('heading', { name: HERO_CONTENT.ko.quickTitle })).toBeVisible();
    await expect(page.getByRole('heading', { name: '프로젝트 한눈에 보기' })).toBeVisible();
    await expect(matrix.locator('.project-evidence-card')).not.toHaveCount(0);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/역할|Role/);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/근거|Evidence/);

    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(projects.length);
    const collapsedCards = page.locator('#projects li.project-item.project-item--collapsed');
    expect(await collapsedCards.count()).toBeGreaterThan(0);
    await expect(collapsedCards.first()).toBeHidden();

    const moreButton = page.locator('.project-more-btn');
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    await expect(page.locator('#project-list')).toHaveClass(/is-expanded/);
    await expect(projectCards).toHaveCount(projects.length);
    for (const card of await collapsedCards.all()) {
      await expect(card).toBeVisible();
    }
  });

  test('default project order follows the displayOrder of the project data', async ({ page }) => {
    for (const [path, locale] of [
      ['/', 'ko'],
      ['/en/', 'en'],
      ['/ja/', 'ja'],
    ]) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      const renderedProjectTitles = await page
        .locator('#projects li.project-item .project-title')
        .evaluateAll((elements) =>
          elements.map((element) => element.textContent?.replace('↗', '').trim())
        );

      expect(renderedProjectTitles).toEqual(projectTitlesInDisplayOrder(locale));
      const visibleCount = await page
        .locator('#projects li.project-item:not(.project-item--collapsed)')
        .count();
      expect(visibleCount).toBeGreaterThan(0);
    }
  });

  test('project evidence links use contextual accessible labels', async ({ page }) => {
    // Evidence targets come from the module the page renders the matrix from.
    const { EVIDENCE_ITEMS } = await import(RECRUITER_DATA_URL);
    const evidenceTitles = EVIDENCE_ITEMS.map((item) => item.title);
    expect(evidenceTitles.length).toBeGreaterThan(0);

    for (const { path, genericLabel, labelFor } of Object.values(EVIDENCE_LABELS)) {
      const expectedLabels = evidenceTitles.map(labelFor);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const links = page.locator('.project-evidence-matrix .project-evidence-card__link');
      await expect(links).toHaveCount(expectedLabels.length);

      const labels = await links.allTextContents();
      const ariaLabels = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('aria-label'))
      );
      const hrefs = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href'))
      );
      const projectTargets = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-evidence-project'))
      );

      expect(labels).toEqual(expectedLabels);
      expect(labels).not.toContain(genericLabel);
      expect(new Set(labels).size).toBe(labels.length);
      // WCAG 2.5.3 Label in Name: no aria-label override — the unique visible
      // link text IS the accessible name.
      expect(ariaLabels).toEqual(expectedLabels.map(() => null));
      expect(hrefs).toEqual(expectedLabels.map(() => '#projects'));
      expect(projectTargets).toEqual(evidenceTitles);
      expect(Math.max(...labels.map((label) => label.length))).toBeLessThanOrEqual(40);
    }
  });
});
