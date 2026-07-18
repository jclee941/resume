const { test, expect } = require('@playwright/test');

const ROUTES = ['/', '/en/', '/ja/'];
const FEATURED_IDS = [
  'project-safetywallet-cf-workers-pwa',
  'project-resume-portfolio',
  'project-ip-blacklist-platform',
];

for (const route of ROUTES) {
  test(`${route} keeps structured project evidence ordered and disclosure accessible`, async ({
    page,
  }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    const cards = page.locator('#project-list > .project-item');
    await expect(cards.first()).toBeVisible();

    expect(await cards.evaluateAll((items) => items.slice(0, 3).map(({ id }) => id))).toEqual(
      FEATURED_IDS
    );
    await expect(page.locator('.project-review-rail__link')).toHaveCount(3);
    await expect(page.locator('ol.project-architecture-steps')).toHaveCount(3);

    const blacklist = page.locator('#project-ip-blacklist-platform .project-evidence');
    await expect(blacklist).not.toContainText(/Product UI|제품 UI|プロダクトUI/);
    await expect(blacklist).not.toContainText(/Delivery & Operations|배포·운영|デリバリー・運用/);

    const visibleCount = () =>
      cards.evaluateAll((items) => items.filter((item) => getComputedStyle(item).display !== 'none').length);
    expect(await visibleCount()).toBe(5);
    const more = page.locator('.project-more-btn');
    await more.click();
    expect(await visibleCount()).toBe(12);
    await expect(more).toBeFocused();
    await more.click();
    expect(await visibleCount()).toBe(5);
    await expect(more).toBeFocused();
  });
}
