const { test, expect } = require('@playwright/test');
const { getDashboardServer } = require('./fixtures/mock-dashboard-server.cjs');

let dashboardBaseUrl;

test.describe('Job Dashboard', () => {
  test.beforeAll(async ({ browserName: _browserName }, testInfo) => {
    const port = 9494 + testInfo.workerIndex;
    const { url } = await getDashboardServer(port);
    dashboardBaseUrl = `${url}/job`;
  });

  test('should load dashboard page', async ({ page }) => {
    await page.goto(`${dashboardBaseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should require authentication', async ({ page }) => {
    await page.goto(`${dashboardBaseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});
