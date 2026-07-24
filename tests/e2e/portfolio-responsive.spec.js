// @ts-check
const { test, expect } = require('@playwright/test');

const SELECTORS = {
  HERO_TITLE: '.hero-title',
  PROJECT_CARD: '#projects .project-list .project-card',
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} [url='/']
 */
async function safeGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping test');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('net::ERR_NETWORK_CHANGED') ||
      message.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping test');
    }
    throw error;
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function checkElementVisible(page, selector) {
  await expect(page.locator(selector)).toBeVisible();
}

/** @param {import('@playwright/test').Page} page */
async function revealProjects(page) {
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await page.waitForSelector(SELECTORS.PROJECT_CARD, { state: 'attached', timeout: 15000 });
  await expect(page.locator('#projects')).toHaveCSS('opacity', '1');
}

test.describe('Responsive Design', () => {
  test('should be mobile responsive (iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page);

    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await revealProjects(page);
    const projectCards = page.locator(SELECTORS.PROJECT_CARD);
    await expect(projectCards.first()).toBeVisible();

    const firstCard = projectCards.first();
    const secondCard = projectCards.nth(1);
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    expect(firstCardBox).toBeTruthy();
    expect(secondCardBox).toBeTruthy();
    if (firstCardBox && secondCardBox) {
      expect(secondCardBox.y).toBeGreaterThanOrEqual(firstCardBox.y + firstCardBox.height - 5);
    }
  });

  test('should be mobile responsive (Samsung Galaxy S20)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await safeGoto(page);

    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await revealProjects(page);
    await expect(page.locator(SELECTORS.PROJECT_CARD).first()).toBeVisible();
  });

  test('should be mobile responsive (iPhone 12 Pro)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page);

    const heroTitle = page.locator('.hero-title');
    const fontSize = await heroTitle.evaluate((el) => window.getComputedStyle(el).fontSize);
    const fontSizeNum = parseFloat(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(24);
  });

  test('should be tablet responsive (iPad)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await safeGoto(page);

    await revealProjects(page);
    const projectCards = page.locator(SELECTORS.PROJECT_CARD);
    await expect(projectCards.first()).toBeVisible();

    const firstCardBox = await projectCards.first().boundingBox();
    const secondCardBox = await projectCards.nth(1).boundingBox();
    expect(firstCardBox).toBeTruthy();
    expect(secondCardBox).toBeTruthy();
  });

  test('should be tablet responsive (iPad Pro)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await safeGoto(page);

    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await revealProjects(page);
    await expect(page.locator(SELECTORS.PROJECT_CARD).first()).toBeVisible();
  });

  test('should handle orientation changes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page);
    await checkElementVisible(page, SELECTORS.HERO_TITLE);

    await page.setViewportSize({ width: 667, height: 375 });
    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await revealProjects(page);
    await expect(page.locator(SELECTORS.PROJECT_CARD).first()).toBeVisible();
  });

  test('should have readable content on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await safeGoto(page);

    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox).toBeTruthy();
    if (bodyBox) {
      expect(bodyBox.width).toBeLessThanOrEqual(320);
    }

    await checkElementVisible(page, SELECTORS.HERO_TITLE);
  });
});
