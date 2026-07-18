const { test, expect } = require('@playwright/test');
const { waitForPortfolioReady } = require('./fixtures/portfolio-qa');

const SECTION_IDS = [
  'hero',
  'projects',
  'skills',
  'resume',
  'operated',
  'about',
  'cover-letter',
  'certifications',
  'contact',
];
const NAV_LINKS = [
  ['#projects', 'projects'],
  ['#skills', 'stack'],
  ['#resume', 'experience'],
  ['#contact', 'contact'],
];
const LOCALES = [
  {
    label: 'KO',
    url: '/',
    headings: [
      '대표 프로젝트',
      '풀스택 역량',
      '경력',
      '보안·인프라 전문성',
      '소개',
      '업무 방식',
      '자격·학습',
      '연락처',
    ],
    summary: '업무 방식 자세히 보기',
  },
  {
    label: 'EN',
    url: '/en/',
    headings: [
      'Featured Builds',
      'Full-Stack Capabilities',
      'Experience',
      'Security & Infrastructure Depth',
      'About',
      'How I Work',
      'Credentials & Learning',
      'Contact',
    ],
    summary: 'Read how I work',
  },
  {
    label: 'JA',
    url: '/ja/',
    headings: [
      '注目プロジェクト',
      'フルスタックの領域',
      '職歴',
      'セキュリティ・インフラの専門性',
      '紹介',
      '仕事の進め方',
      '資格・学習',
      '連絡先',
    ],
    summary: '仕事の進め方を読む',
  },
];

async function openReady(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await waitForPortfolioReady(page);
}

test.describe('full-stack first-scan story', () => {
  for (const locale of LOCALES) {
    test(`${locale.label} keeps the exact section order, headings, and stable nav`, async ({
      page,
    }) => {
      await openReady(page, locale.url);

      await expect(
        page.locator('.section-cmd__story, .section-cmd, .section-cmd__command')
      ).toHaveCount(0);
      await expect(page.locator('main > section[id]')).toHaveCount(SECTION_IDS.length);
      expect(
        await page
          .locator('main > section[id]')
          .evaluateAll((sections) => sections.map((s) => s.id))
      ).toEqual(SECTION_IDS);
      expect(
        await page
          .locator('main > section[id]:not(#hero) > h2')
          .evaluateAll((headings) => headings.map((heading) => (heading.textContent || '').trim()))
      ).toEqual(locale.headings);

      const links = await page
        .locator('#nav-links > a')
        .evaluateAll((anchors) =>
          anchors.map((anchor) => [anchor.getAttribute('href'), (anchor.textContent || '').trim()])
        );
      expect(links).toEqual(NAV_LINKS);
      for (const [href] of NAV_LINKS) {
        await expect(page.locator(href)).toHaveCount(1);
      }
    });

    test(`${locale.label} cover letter is a native closed keyboard disclosure`, async ({
      page,
    }) => {
      await openReady(page, locale.url);

      const details = page.locator('#cover-letter details');
      const summary = details.getByText(locale.summary, { exact: true });
      const content = details.locator('.cover-letter-card');
      await expect(details).not.toHaveAttribute('open', '');
      await expect(content).toBeHidden();

      await summary.focus();
      await expect(summary).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await expect(content).toBeVisible();
      await expect(summary).toBeFocused();

      await page.keyboard.press('Space');
      await expect(details).not.toHaveAttribute('open', '');
      await expect(content).toBeHidden();
      await expect(summary).toBeFocused();
    });
  }

  test('root and /ko/ expose the same Korean information architecture', async ({ page }) => {
    const snapshots = [];
    for (const url of ['/', '/ko/']) {
      await openReady(page, url);
      snapshots.push(
        await page.evaluate(() => ({
          sections: [...document.querySelectorAll('main > section[id]')].map(
            (section) => section.id
          ),
          headings: [...document.querySelectorAll('main > section:not(#hero) > h2')].map(
            (heading) => (heading.textContent || '').trim()
          ),
          nav: [...document.querySelectorAll('#nav-links > a')].map(
            (anchor) => `${(anchor.textContent || '').trim()}:${anchor.getAttribute('href')}`
          ),
          summary: document.querySelector('#cover-letter summary')?.textContent?.trim(),
        }))
      );
    }
    expect(snapshots[1]).toEqual(snapshots[0]);
  });
});
