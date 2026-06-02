// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Cover Letter — first-class VISUAL section E2E.
 *
 * The cover letter was previously reachable only via the terminal `coverletter`
 * command. These tests verify the dedicated scrollable `#cover-letter` section
 * renders the real SSoT copy per-locale, and that the terminal CLI command path
 * still works (regression). Zero fabricated fixtures — content comes from SSoT.
 */

const coverLetter = require('../../packages/data/resumes/master/resume_data.json').coverLetter;

async function safeGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping cover letter visual test');
    }
  } catch (error) {
    if (
      error.message?.includes('net::ERR_NETWORK_CHANGED') ||
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping cover letter visual test');
    }
    throw error;
  }
}

test.describe('Cover Letter - visual section (scrollable page)', () => {
  test('S1: KO page has a dedicated #cover-letter section with the cat motif', async ({ page }) => {
    await safeGoto(page, '/');
    const section = page.locator('#cover-letter');
    await expect(section).toHaveCount(1);
    await expect(section.locator('.section-cmd__command')).toContainText('cat coverletter.txt');
    await expect(section.locator('.cover-letter-card')).toHaveCount(1);
  });

  test('S1: KO section renders the real headline, every paragraph, and closing', async ({
    page,
  }) => {
    await safeGoto(page, '/');
    const card = page.locator('#cover-letter .cover-letter-card');
    await card.scrollIntoViewIfNeeded();
    await expect(page.locator('#cover-letter .cover-letter__headline')).toContainText(
      coverLetter.ko.headline.slice(0, 20)
    );
    // Each paragraph's first 16 chars must appear in the rendered text.
    for (const para of coverLetter.ko.paragraphs) {
      await expect(card).toContainText(para.slice(0, 16));
    }
    await expect(page.locator('#cover-letter .cover-letter__closing')).toContainText(
      coverLetter.ko.closing.slice(0, 12)
    );
  });

  test('S1: numbered rail has one marker per paragraph', async ({ page }) => {
    await safeGoto(page, '/');
    const markers = page.locator('#cover-letter .cover-letter__index');
    await expect(markers).toHaveCount(coverLetter.ko.paragraphs.length);
  });

  test('S4 (XSS guard): section content is text, not injected markup', async ({ page }) => {
    await safeGoto(page, '/');
    // No stray <script> elements should have been injected from the data.
    const injected = await page.locator('#cover-letter script').count();
    expect(injected).toBe(0);
  });
});

test.describe('Cover Letter - visual section locale parity', () => {
  test('S3: EN route shows the English cover letter, not Korean', async ({ page }) => {
    await safeGoto(page, '/en/');
    const card = page.locator('#cover-letter .cover-letter-card');
    await expect(card).toHaveCount(1);
    await expect(page.locator('#cover-letter .cover-letter__headline')).toContainText(
      coverLetter.en.headline.slice(0, 16)
    );
    await expect(card).not.toContainText(coverLetter.ko.headline.slice(0, 12));
  });

  test('S3: JA route shows the Japanese cover letter, not Korean', async ({ page }) => {
    await safeGoto(page, '/ja/');
    const card = page.locator('#cover-letter .cover-letter-card');
    await expect(card).toHaveCount(1);
    await expect(page.locator('#cover-letter .cover-letter__headline')).toContainText(
      coverLetter.ja.headline.slice(0, 12)
    );
    await expect(card).not.toContainText(coverLetter.ko.headline.slice(0, 12));
  });
});

test.describe('Cover Letter - terminal CLI still works (regression)', () => {
  test('S4: coverletter command still prints the KO headline', async ({ page }) => {
    await safeGoto(page, '/');
    const cliInput = page.locator('#terminal-input');
    await cliInput.fill('coverletter');
    await cliInput.press('Enter');
    await expect(page.locator('#cli-output')).toContainText(coverLetter.ko.headline.slice(0, 12));
  });
});
