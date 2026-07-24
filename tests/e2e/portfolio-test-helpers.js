// @ts-check
const { test, expect } = require('@playwright/test');

const SELECTORS = {
  HERO_TITLE: '.hero-title',
  // Projects render server-side as <li.project-item.project-card> inside the
  // clean <ul.project-list>. Sections use scroll-reveal (opacity 0 until in view).
  PROJECT_CARD: '#projects .project-list .project-card',
  DEEP_DIVE_GRID: '.project-cards-grid',
  DEEP_DIVE_CARD: '.project-cards-grid .project-card',
};

const REGEX_PATTERNS = {
  // Site title is locale-specific (KO default: "이재철 - 보안 엔지니어").
  TITLE: /(?:Jaecheol Lee|이재철)/,
};

/** @param {import('@playwright/test').Page} page */
async function navigateToHome(page) {
  try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping portfolio test');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('net::ERR_NETWORK_CHANGED') ||
      message.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping portfolio test');
    }
    throw error;
  }
}

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

// Sections animate in on scroll (opacity 0 until revealed). Bring #projects
// into view and wait for the reveal before asserting card visibility.
/** @param {import('@playwright/test').Page} page */
async function revealProjects(page) {
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await page.waitForSelector(SELECTORS.PROJECT_CARD, { state: 'attached', timeout: 15000 });
  await expect(page.locator('#projects')).toHaveCSS('opacity', '1');
}

module.exports = {
  SELECTORS,
  REGEX_PATTERNS,
  navigateToHome,
  safeGoto,
  checkElementVisible,
  revealProjects,
};
