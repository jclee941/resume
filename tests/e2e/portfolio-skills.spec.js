// @ts-check
const { test, expect } = require('@playwright/test');

for (const [locale, pathname] of [
  ['ko', '/'],
  ['en', '/en/'],
  ['ja', '/ja/'],
]) {
  test.describe(`${locale} skills section`, () => {
    test('shows every skill as a visible tag without search or accordion', async ({ page }) => {
      await page.goto(pathname, { waitUntil: 'domcontentloaded' });
      const grid = page.locator('#skill-radar-grid');
      const cards = grid.locator('.skill-domain-card');
      await expect(cards.first()).toBeVisible({ timeout: 15000 });

      await expect(page.locator('#skill-search-input, #skill-search-count')).toHaveCount(0);
      await expect(grid.locator('[aria-expanded], [role="button"], .skill-panel')).toHaveCount(0);

      for (const card of await cards.all()) {
        const heading = card.getByRole('heading', { level: 3 });
        await expect(heading).toBeVisible();
        const list = card.getByRole('list', { name: await heading.innerText() });
        const items = list.locator('.skill-item');
        await expect(items.first()).toBeVisible();
        for (const item of await items.all()) {
          await expect(item).toBeVisible();
          await expect(item).toHaveAttribute('data-skill', (await item.innerText()).trim());
        }
      }
    });
  });
}
