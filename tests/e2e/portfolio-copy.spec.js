const { test, expect } = require('@playwright/test');
const { escapeRegExp } = require('../helpers/owner-data');
const { HERO_CONTENT, hiringMailto } = require('./fixtures/owner-copy');

// Hero copy is read from the module the Worker renders the hero from, so the
// spec follows whatever content is materialized instead of pinning it.
const { ko, en, ja } = HERO_CONTENT;

test.describe('Portfolio hiring copy', () => {
  test('should expose recruiter-ready evidence and hiring actions above the fold', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hero = page.locator('#hero');
    await expect(hero.getByText(ko.availability)).toBeVisible();
    await expect(hero.getByText(ko.positioning)).toBeVisible();
    await expect(hero.getByText(ko.packetItems[0][1])).toBeVisible();
    await expect(hero.locator('.hiring-review-packet__status')).toHaveText(ko.packetStatus);
    await expect(hero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
    await expect(hero.getByText('검토 가능')).toHaveCount(0);
    await expect(hero.getByRole('link', { name: ko.actions[0], exact: true })).toHaveAttribute(
      'href',
      hiringMailto('ko')
    );
    await expect(hero.getByRole('link', { name: ko.actions[1], exact: true })).toHaveAttribute(
      'href',
      '#resume'
    );
    await expect(hero.getByRole('link', { name: ko.actions[2], exact: true })).toHaveAttribute(
      'href',
      '#projects'
    );
    const [, proofTitle, proofDetail] = ko.publicProofLinks[0];
    await expect(
      hero.getByRole('link', {
        name: new RegExp(`${escapeRegExp(proofTitle)}.*${escapeRegExp(proofDetail)}`),
      })
    ).toBeVisible();
    await expect(hero.getByText('증빙 프로젝트 보기')).toHaveCount(0);
    await expect(hero.getByText('공개 운영 근거')).toHaveCount(0);
  });

  test('should keep localized hiring copy aligned across English and Japanese pages', async ({
    page,
  }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const englishHero = page.locator('#hero');
    await expect(englishHero.getByText(en.availability)).toBeVisible();
    await expect(englishHero.getByText(en.packetStatus, { exact: true })).toBeVisible();
    await expect(englishHero.locator('.hero-public-proof__label')).toContainText(
      en.publicProofLabel
    );
    await expect(englishHero.getByText('Public proof shortcuts')).toHaveCount(0);
    await expect(englishHero.getByText(/passed the FSC|passed licensing audits/i)).toHaveCount(0);
    await expect(
      englishHero.getByRole('link', { name: en.actions[0], exact: true })
    ).toHaveAttribute('href', hiringMailto('en'));
    await expect(
      englishHero.getByRole('link', { name: en.actions[1], exact: true })
    ).toHaveAttribute('href', '#resume');
    await expect(
      englishHero.getByRole('link', { name: en.actions[2], exact: true })
    ).toHaveAttribute('href', '#projects');

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    const japaneseHero = page.locator('#hero');
    await expect(japaneseHero.getByText(ja.availability)).toBeVisible();
    await expect(japaneseHero.getByText(ja.positioning)).toBeVisible();
    await expect(japaneseHero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
    await expect(japaneseHero.getByText('確認可能')).toHaveCount(0);
    await expect(japaneseHero.getByText('証跡')).toHaveCount(0);
    await expect(japaneseHero.getByText(/通過|FSC本認可/)).toHaveCount(0);
    await expect(japaneseHero.locator('.hero-proof-list')).toHaveAttribute(
      'aria-label',
      ja.proofLabel
    );
    await expect(
      japaneseHero.getByRole('link', { name: ja.actions[0], exact: true })
    ).toBeVisible();
    await expect(
      japaneseHero.getByRole('link', { name: ja.actions[2], exact: true })
    ).toHaveAttribute('href', '#projects');
  });
});
