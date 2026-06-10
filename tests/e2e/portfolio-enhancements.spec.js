// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const recruiterEnhancementSource = path.join(
  __dirname,
  '../../apps/portfolio/src/scripts/modules/recruiter-enhancements.js'
);

test.describe('Portfolio recruiter enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('role quick paths focus matching evidence without removing project cards', async ({
    page,
  }) => {
    const projectCards = page.locator('#projects li.project-item');
    const initialProjectCount = await projectCards.count();

    await page.getByRole('button', { name: /Security Ops/ }).click();

    await expect(page.getByRole('button', { name: /Security Ops/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
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

  test('project evidence matrix preserves project list and project more behavior', async ({
    page,
  }) => {
    const matrix = page.locator('.project-evidence-matrix');
    await expect(matrix).toBeVisible();
    await expect(matrix.locator('.project-evidence-card')).toHaveCount(4);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/역할|Role/);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/증거|Evidence/);

    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(9);

    const moreButton = page.locator('.project-more-btn');
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    await expect(page.locator('#project-list')).toHaveClass(/is-expanded/);
    await expect(projectCards.nth(8)).toBeVisible();
  });

  test('project evidence links expand collapsed target projects before highlighting', async ({
    page,
  }) => {
    const reviewerLink = page
      .locator('[data-evidence-project="AI GitHub PR Reviewer"]')
      .getByText(/증거 보기|Open proof/);
    await reviewerLink.click();

    await expect(page.locator('#project-list')).toHaveClass(/is-expanded/);
    const reviewerCard = page.locator('#projects li.project-item', {
      hasText: 'AI GitHub PR Reviewer',
    });
    await expect(reviewerCard).toBeVisible();
    await expect(reviewerCard).toHaveClass(/is-role-match/);
  });

  test('HTML template escaping remains safe for quoted attributes', async () => {
    const source = fs.readFileSync(recruiterEnhancementSource, 'utf8');
    for (const entity of ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;']) {
      expect(source).toContain(entity);
    }
  });
});

test.describe('Mobile recruiter actions', () => {
  test('mobile recruiter action bar keeps core actions reachable without overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const actionBar = page.locator('.recruiter-action-bar');
    await expect(actionBar).toBeHidden();

    await page.evaluate(() => window.scrollBy(0, 720));

    await expect(actionBar).toBeVisible();
    await expect(actionBar.getByRole('link', { name: /문의|Contact/ })).toHaveAttribute(
      'href',
      /mailto:/
    );
    await expect(actionBar.getByRole('link', { name: /프로젝트|Projects/ })).toHaveAttribute(
      'href',
      '#projects'
    );
    await expect(actionBar.getByRole('link', { name: /PDF/ })).toHaveAttribute(
      'href',
      '/resume.pdf'
    );

    await actionBar.getByRole('button', { name: /닫기|Dismiss/ }).click();
    await expect(actionBar).toBeHidden();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
