const { test, expect } = require('@playwright/test');
const { escapeRegExp } = require('../helpers/owner-data');
const { ownerIdentity, ownerNamePattern } = require('./fixtures/owner-copy');

test.describe('Portfolio UI', () => {
  test('should load Korean homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(ownerNamePattern());
  });

  test('should load English homepage', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(new RegExp(escapeRegExp(ownerIdentity('en').name)));
  });

  test('should not expose terminal input or command registry', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#terminal-input')).toHaveCount(0);
    expect(await page.evaluate(() => 'terminalCommands' in window)).toBe(false);
  });

  test('should not render CLI output', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#cli-output')).toHaveCount(0);
  });

  test('should not render the removed observability widget', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#observability')).toHaveCount(0);
  });

  test('should keep observability polling UI removed from the homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#observability')).toHaveCount(0);
  });
});
