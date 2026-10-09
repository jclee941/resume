// @ts-check
const { test, expect } = require('@playwright/test');
const { projects } = require('../../apps/portfolio/data.json');
const { escapeRegExp } = require('../helpers/owner-data');
const { HERO_CONTENT, projectTitlesInDisplayOrder } = require('./fixtures/owner-copy');

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

  test('projects open with role filters, no evidence matrix, and keep the more behavior', async ({
    page,
  }) => {
    const rolePaths = page.locator('#projects .role-quick-paths');
    await expect(rolePaths).toBeVisible();
    await expect(page.locator('#hero .role-quick-paths')).toHaveCount(0);
    await expect(
      rolePaths.getByRole('heading', { name: HERO_CONTENT.ko.quickTitle })
    ).toBeVisible();
    await expect(page.locator('.project-evidence-matrix, .project-review-rail')).toHaveCount(0);
    const filterBeforeList = await page.evaluate(() => {
      const filter = document.querySelector('#projects .role-quick-paths');
      const list = document.querySelector('#project-list');
      return Boolean(
        filter && list && filter.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
    expect(filterBeforeList).toBe(true);

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

  test('featured projects pair three case-note rows with an architecture diagram', async ({
    page,
  }) => {
    for (const pathname of ['/', '/en/', '/ja/']) {
      await page.goto(pathname, { waitUntil: 'domcontentloaded' });
      const featured = page.locator('#projects li.project-card--featured');
      await expect(featured).toHaveCount(3);

      for (const card of await featured.all()) {
        await expect(card.locator('.project-case-notes dt')).toHaveCount(3);
        const diagram = card.locator('figure.project-diagram svg[role="img"]:visible');
        await expect(diagram).toHaveCount(1);
        const title = (await card.locator('.project-title').innerText()).replace('↗', '').trim();
        await expect(diagram).toHaveAccessibleName(new RegExp(escapeRegExp(title)));
        await expect(card.locator('.project-links a')).not.toHaveText([/\[/]);
      }
      await expect(
        page.locator('#projects .project-link-btn').filter({ hasText: /^\[/ })
      ).toHaveCount(0);
    }
  });
});
