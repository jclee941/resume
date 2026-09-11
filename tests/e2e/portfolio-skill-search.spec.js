const { test, expect } = require('@playwright/test');

const locales = [
  { locale: 'ko', count: '2개 기술 검색됨', empty: '검색 결과가 없습니다.' },
  { locale: 'en', count: '2 skills found', empty: 'No matching skills.' },
  { locale: 'ja', count: '2件のスキルが見つかりました', empty: '一致するスキルがありません。' },
];

for (const { locale, count, empty } of locales) {
  test.describe(`${locale} skill search`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${locale}/`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.skill-domain-card').first()).toBeVisible();
    });

    test('counts matching entries once across multiple domains', async ({ page }) => {
      await expect(page.locator('.skill-item[data-skill="Go"]')).toHaveCount(2);
      await page.getByRole('textbox').fill(' GO ');

      const counter = page.locator('#skill-search-count');
      await expect(counter).toHaveText(count);
      await expect(counter).toBeVisible();
      await expect(page.locator('.skill-domain-card:visible')).toHaveCount(2);
    });

    test('domain searches retain every skill and its evidence', async ({ page }) => {
      const card = page.locator('.skill-domain-card').first();
      const title = await card.getByRole('heading').innerText();
      const skills = card.locator('.skill-item');
      const skillCount = await skills.count();
      await card.click();
      await page.getByRole('textbox').fill(title);

      await expect(page.locator('#skill-search-count')).toContainText(String(skillCount));
      await expect(card.locator('.skill-item:visible')).toHaveCount(skillCount);
      await expect(card.locator('.skill-evidence-item:visible')).toHaveCount(skillCount);
    });

    test('explains empty results and restores skills when cleared', async ({ page }) => {
      const cards = page.locator('.skill-domain-card');
      const cardCount = await cards.count();
      const search = page.getByRole('textbox');
      await search.fill('no-such-skill-qa');

      await expect(page.locator('.skill-radar__no-results')).toContainText(empty);
      await expect(page.locator('.skill-radar__no-results')).toBeVisible();
      await expect(page.locator('#skill-search-count')).toContainText('0');
      await expect(page.locator('.skill-domain-card:visible')).toHaveCount(0);

      await search.fill('');
      await expect(page.locator('.skill-radar__no-results')).toBeHidden();
      await expect(page.locator('#skill-search-count')).toBeHidden();
      await expect(page.locator('.skill-domain-card:visible')).toHaveCount(cardCount);
    });
  });
}
