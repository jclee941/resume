// @ts-check
const { test, expect } = require('@playwright/test');
require('./fixtures/helpers');

// Test Constants
const SELECTORS = {
  HERO_TITLE: '.hero-title',
  // Projects render server-side as <li.project-item.project-card> inside the
  // clean <ul.project-list>. Sections use scroll-reveal (opacity 0 until in view).
  PROJECT_CARD: '#projects .project-list .project-card',
  PROJECT_LIST: '#projects .project-list',
  PROJECT_MORE_BUTTON: '[data-projects-expand]',
  PROJECT_LINK_PRIMARY: '#projects .project-card a[href]',
};

const REGEX_PATTERNS = {
  // Site title is locale-specific (KO default: "이재철 - 보안 엔지니어").
  TITLE: /(?:Jaecheol Lee|이재철)/,
};

// Helper Functions
async function navigateToHome(page, _testInfo) {
  try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping portfolio test');
    }
  } catch (error) {
    if (
      error.message?.includes('net::ERR_NETWORK_CHANGED') ||
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping portfolio test');
    }
    throw error;
  }
}

async function safeGoto(page, testInfo, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping test');
    }
  } catch (error) {
    if (
      error.message?.includes('net::ERR_NETWORK_CHANGED') ||
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping test');
    }
    throw error;
  }
}

async function checkElementVisible(page, selector) {
  await expect(page.locator(selector)).toBeVisible();
}

// Sections animate in on scroll (opacity 0 until revealed). Bring #projects
// into view and wait for the reveal before asserting card visibility.
async function revealProjects(page) {
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await page.waitForSelector(SELECTORS.PROJECT_CARD, { state: 'attached', timeout: 15000 });
  await expect(page.locator('#projects')).toHaveCSS('opacity', '1');
}

test.describe('Portfolio Homepage', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await navigateToHome(page, testInfo);
  });

  test('should load successfully', async ({ page }) => {
    await expect(page).toHaveTitle(REGEX_PATTERNS.TITLE);
  });

  test('should display hero section', async ({ page }) => {
    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await expect(page.locator(SELECTORS.HERO_TITLE)).toContainText(/Jaecheol Lee|이재철/);
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

  test('should render and expand the project list', async ({ page }) => {
    await revealProjects(page);
    const projectList = page.locator(SELECTORS.PROJECT_LIST);
    const firstExtraProject = projectList.locator('.project-item--collapsed').first();
    const expandButton = page.locator(SELECTORS.PROJECT_MORE_BUTTON);

    await expect(projectList).toBeVisible();
    await expect(firstExtraProject).toBeHidden();
    await expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    await expandButton.click();
    await expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    await expect(projectList).toHaveAttribute('data-projects-expanded', 'true');
    await expect(firstExtraProject).toBeVisible();
  });

  test('should have working scroll to sections', async ({ page }) => {
    // Test navigation to projects section
    await page.click('a[href="#projects"]');
    await page.waitForTimeout(500); // Allow scroll animation
    const projectsSection = page.locator('#projects');
    await expect(projectsSection).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should be mobile responsive (iPhone SE)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page, testInfo);

    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await revealProjects(page);
    const projectCards = page.locator(SELECTORS.PROJECT_CARD);
    await expect(projectCards.first()).toBeVisible();

    // Check cards are stacked vertically (mobile layout)
    const firstCard = projectCards.first();
    const secondCard = projectCards.nth(1);
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    // Cards should be vertically stacked (second card below first)
    // Allow small tolerance for sub-pixel rendering differences
    expect(firstCardBox).toBeTruthy();
    expect(secondCardBox).toBeTruthy();
    if (firstCardBox && secondCardBox) {
      expect(secondCardBox.y).toBeGreaterThanOrEqual(firstCardBox.y + firstCardBox.height - 5);
    }
  });

  test('should be mobile responsive (Samsung Galaxy S20)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await safeGoto(page, testInfo);

    // Check content visibility
    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    // Project cards render server-side; verify at least one is present.
    await revealProjects(page);
    await expect(page.locator(SELECTORS.PROJECT_CARD).first()).toBeVisible();
  });

  test('should be mobile responsive (iPhone 12 Pro)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, testInfo);

    // Check font sizes are readable on mobile
    const heroTitle = page.locator('.hero-title');
    const fontSize = await heroTitle.evaluate((el) => window.getComputedStyle(el).fontSize);
    const fontSizeNum = parseFloat(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(24); // Minimum readable size
  });

  test('should be tablet responsive (iPad)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await safeGoto(page, testInfo);

    await revealProjects(page);
    const projectCards = page.locator(SELECTORS.PROJECT_CARD);
    await expect(projectCards.first()).toBeVisible();

    // Check two-column layout on tablet
    const firstCardBox = await projectCards.first().boundingBox();
    const secondCardBox = await projectCards.nth(1).boundingBox();

    // On tablet, cards may be side-by-side or stacked
    // Just verify they're both visible
    expect(firstCardBox).toBeTruthy();
    expect(secondCardBox).toBeTruthy();
  });

  test('should be tablet responsive (iPad Pro)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await safeGoto(page, testInfo);

    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await revealProjects(page);
    await expect(page.locator(SELECTORS.PROJECT_CARD).first()).toBeVisible();
  });

  test('should handle orientation changes', async ({ page }, testInfo) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page, testInfo);
    await checkElementVisible(page, SELECTORS.HERO_TITLE);

    // Landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await checkElementVisible(page, SELECTORS.HERO_TITLE);
    await revealProjects(page);
    await expect(page.locator(SELECTORS.PROJECT_CARD).first()).toBeVisible();
  });

  test('should have readable content on small screens', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 }); // Smallest supported
    await safeGoto(page, testInfo);

    // Check content doesn't overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox).toBeTruthy();
    if (bodyBox) {
      expect(bodyBox.width).toBeLessThanOrEqual(320);
    }

    // Check text is still visible
    await checkElementVisible(page, SELECTORS.HERO_TITLE);
  });
});
// Performance tests moved to performance.spec.js
// Security header tests moved to security.spec.js
