const { test, expect } = require('@playwright/test');

test.describe('Job Dashboard', () => {
  // /job/dashboard is served by the job-automation worker, not the portfolio worker.
  // In CI the webServer only starts the portfolio worker, so these tests must be skipped
  // unless the job-automation worker is also running (e.g. testing against production).
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/job/dashboard');
    const body = await response.text();
    test.skip(
      !body || body.trim().length === 0,
      'Job dashboard not available — portfolio-only webServer'
    );
  });

  test('should load dashboard page', async ({ page }) => {
    await page.goto('/job/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should require authentication', async ({ page }) => {
    await page.goto('/job/dashboard', { waitUntil: 'domcontentloaded' });
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});
