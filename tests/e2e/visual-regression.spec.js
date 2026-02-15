const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const snapshotDir = path.join(__dirname, 'visual-regression.spec.js-snapshots');
const hasSnapshots = fs.existsSync(snapshotDir) && fs.readdirSync(snapshotDir).length > 0;

test.describe('Visual Regression', () => {
  test.skip(!hasSnapshots, 'No snapshot baselines — run: npx playwright test --update-snapshots');

  test('Korean homepage visual snapshot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('ko-homepage.png', { maxDiffPixels: 100 });
  });

  test('English homepage visual snapshot', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('en-homepage.png', { maxDiffPixels: 100 });
  });
});
