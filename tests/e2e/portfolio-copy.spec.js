const { test, expect } = require('@playwright/test');
const { HERO_CONTENT, hiringMailto } = require('./fixtures/owner-copy');

// Hero copy is read from the module the Worker renders the hero from, so the
// spec follows whatever content is materialized instead of pinning it.
const { ko, en, ja } = HERO_CONTENT;

async function expectHiringPath(hero, content, locale) {
  await expect(hero.getByText(content.availability, { exact: true })).toBeVisible();
  await expect(hero.getByText(content.positioning, { exact: true })).toBeVisible();
  await expect(hero.locator('.hero-proof-list')).toHaveAttribute('aria-label', content.proofLabel);
  await expect(hero.getByRole('link', { name: content.actions[0], exact: true })).toHaveAttribute(
    'href',
    hiringMailto(locale)
  );
  await expect(hero.getByRole('link', { name: content.actions[3], exact: true })).toHaveAttribute(
    'href',
    '/resume.pdf'
  );
  await expect(hero.getByRole('link', { name: content.actions[2], exact: true })).toHaveAttribute(
    'href',
    '#projects'
  );
  await expect(hero.locator('.hero-cta a')).toHaveCount(3);
  await expect(hero.locator('.hero-availability')).toHaveCount(1);
  await expect(
    hero.locator('.hiring-review-packet, .hero-public-proof, .hero-review-path, .role-chip')
  ).toHaveCount(0);
  await expect(hero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
}

test.describe('Portfolio hiring copy', () => {
  test('Korean hero states the value and keeps one hiring path above the fold', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hero = page.locator('#hero');
    await expectHiringPath(hero, ko, 'ko');
    await expect(hero.getByText('검토 가능')).toHaveCount(0);
    await expect(hero.getByText('한 페이지에 모았습니다')).toHaveCount(0);
    await expect(hero.locator('.hero-portrait img')).toBeVisible();
    await expect(hero.locator('.hero-trust li')).not.toHaveCount(0);
  });

  test('English and Japanese heroes keep the same hiring path', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const englishHero = page.locator('#hero');
    await expectHiringPath(englishHero, en, 'en');
    await expect(englishHero.getByText(/passed the FSC|passed licensing audits/i)).toHaveCount(0);

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    const japaneseHero = page.locator('#hero');
    await expectHiringPath(japaneseHero, ja, 'ja');
    await expect(japaneseHero.getByText('確認可能')).toHaveCount(0);
    await expect(japaneseHero.getByText('証跡')).toHaveCount(0);
    await expect(japaneseHero.getByText(/通過|FSC本認可/)).toHaveCount(0);
  });
});
