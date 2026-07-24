// @ts-check
const { test, expect } = require('@playwright/test');
const { SELECTORS, navigateToHome, revealProjects } = require('./portfolio-test-helpers.js');

test.describe('Portfolio Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToHome(page);
  });

  test('should display project cards', async ({ page }) => {
    await revealProjects(page);
    const projectCards = page.locator(SELECTORS.PROJECT_CARD);
    const count = await projectCards.count();
    expect(count).toBeGreaterThan(0);
    await expect(projectCards.first()).toBeVisible();
  });

  test('project cards are semantic list items', async ({ page }) => {
    await revealProjects(page);
    const cards = page.locator(SELECTORS.PROJECT_CARD);
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    // Clean layout renders cards as <li> inside <ul.project-list>.
    for (let i = 0; i < Math.min(count, 3); i++) {
      const tag = await cards.nth(i).evaluate((el) => el.tagName.toLowerCase());
      expect(tag).toBe('li');
    }
  });

  test('should render and open deep-dive project cards', async ({ page }) => {
    const deepDiveGrid = page.locator(SELECTORS.DEEP_DIVE_GRID);
    await deepDiveGrid.scrollIntoViewIfNeeded();
    await expect(deepDiveGrid).toBeVisible();

    const deepDiveCards = page.locator(SELECTORS.DEEP_DIVE_CARD);
    await expect(deepDiveCards.first()).toBeVisible();
    await expect(deepDiveGrid.locator('.portfolio-icon').first()).toBeVisible();
    await expect(deepDiveGrid).not.toContainText(/[\u{1F300}-\u{1FAFF}]/u);
    await deepDiveCards.first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading').first()).toBeVisible();
    await expect(dialog.locator('.portfolio-icon').first()).toBeVisible();
    await expect(dialog).not.toContainText(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
