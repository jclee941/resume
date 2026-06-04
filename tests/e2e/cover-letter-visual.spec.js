// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Cover Letter — first-class VISUAL section E2E.
 *
 * These tests verify the dedicated scrollable `#cover-letter` section renders
 * the real SSoT copy per-locale in the clean layout. Zero fabricated fixtures
 * — content comes from SSoT.
 */

const coverLetter = require('../../packages/data/resumes/master/resume_data.json').coverLetter;

/** @param {import('@playwright/test').Page} page */
async function safeGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping cover letter visual test');
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('net::ERR_NETWORK_CHANGED') || error.message.includes('net::ERR_INTERNET_DISCONNECTED'))) {
      test.skip(true, 'Network unavailable - skipping cover letter visual test');
    }
    throw error;
  }
}

test.describe('Cover Letter - visual section (scrollable page)', () => {
  test('S1: KO page has a dedicated clean #cover-letter section', async ({ page }) => {
    await safeGoto(page, '/');
    const section = page.locator('#cover-letter');
    await expect(section).toHaveCount(1);
    await expect(section.getByRole('heading').first()).toBeVisible();
    await expect(section).toContainText(coverLetter.ko.headline.slice(0, 12));
    await expect(section.locator('.cover-letter-card')).toHaveCount(1);
    await expect(section.locator('.section-cmd, .section-cmd__command')).toHaveCount(0);
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

  test('S2: Korean cover letter leads with client project work, not staffing company names', async ({
    page,
  }) => {
    await safeGoto(page, '/');
    const card = page.locator('#cover-letter .cover-letter-card');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toContainText('넥스트레이드 매매체결시스템 보안 트랙을 구축 단계부터 운영 단계까지 연속 수행');
    await expect(card).toContainText('(가온누리정보시스템 구축 단계, 아이티센 CTS 운영 단계)');
    await expect(card).not.toContainText('직전에는 가온누리에서 시작해 아이티센 CTS로 이어지는');
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

test.describe('Cover Letter - section remains first-class', () => {
  test('S4: coverletter command is removed while section still renders', async ({ page }) => {
    await safeGoto(page, '/');
    await expect(page.locator('#cover-letter .cover-letter-card')).toHaveCount(1);
    await expect(page.locator('#cli-output')).toHaveCount(0);
    await expect(page.locator('#cover-letter .cover-letter-card')).toContainText(
      coverLetter.ko.headline.slice(0, 12)
    );
  });
});
