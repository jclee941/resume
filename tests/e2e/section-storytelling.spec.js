const { test, expect } = require('@playwright/test');

const targetSections = ['about', 'resume', 'certifications', 'projects', 'skills', 'operated', 'contact'];

async function safeGoto(page, url = '/') {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (!response || response.status() >= 500) {
    test.skip(true, 'Server unavailable');
  }
}

test.describe('section storytelling intros', () => {
  for (const [label, url] of [
    ['KO', '/'],
    ['EN', '/en/'],
  ]) {
    test(`${label} page removes section command/story prefixes`, async ({ page }) => {
      await safeGoto(page, url);

      await expect(page.locator('.section-cmd__story, .section-cmd, .section-cmd__command')).toHaveCount(0);
    });

    test(`${label} page keeps target sections identifiable with accessible headings`, async ({ page }) => {
      await safeGoto(page, url);

      for (const sectionId of targetSections) {
        const section = page.locator(`#${sectionId}`);
        await expect(section).toHaveCount(1);
        await expect(section.getByRole('heading').first()).toBeVisible();
      }
    });
  }
});
