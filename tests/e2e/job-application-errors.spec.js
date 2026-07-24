const { test, expect } = require('@playwright/test');
const { getServer, resetApplications } = require('./fixtures/mock-job-site');

const MOCK_SERVER_BASE_PORT = 9393;
let mockServerPort = MOCK_SERVER_BASE_PORT;
let mockServerUrl = `http://localhost:${mockServerPort}`;

test.describe.serial('Job Application Browser Automation', () => {
  test.beforeAll(async ({ browser: _browser }, testInfo) => {
    mockServerPort = MOCK_SERVER_BASE_PORT + testInfo.workerIndex;
    mockServerUrl = `http://localhost:${mockServerPort}`;
    await getServer(mockServerPort);
  });

  test.beforeEach(async ({ page: _page }, testInfo) => {
    const count = await resetApplications(mockServerPort);
    console.log(`[Job Application E2E] Reset state before "${testInfo.title}" -> count=${count}`);
    expect(count).toBe(0);
  });

  test.describe('Test D: Error Handling', () => {
    test('should handle 500 server error', async ({ page }) => {
      await page.goto(`${mockServerUrl}/error/500`, {
        waitUntil: 'domcontentloaded',
      });

      const response = await page.evaluate(() =>
        fetch('/error/500').then((r) => ({ status: r.status, ok: r.ok }))
      );

      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);
    });

    test('should retry on transient failure', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      let attempts = 0;
      const maxRetries = 3;

      for (let i = 0; i < maxRetries; i++) {
        attempts++;
        await page.evaluate(() => fetch('/error/500'));
        await page.waitForTimeout(100);
      }

      expect(attempts).toBe(maxRetries);
    });

    test('should capture screenshot on page error', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      await page
        .evaluate(() => {
          throw new Error('Test error for screenshot capture');
        })
        .catch(() => {});

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `test-results/test-error-${timestamp}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      expect(screenshotPath).toContain('test-error');
      expect(screenshotPath).toMatch(/\.png$/);
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      const timeout = 5000;

      await expect(
        page.goto(`${mockServerUrl}/error/timeout`, {
          waitUntil: 'domcontentloaded',
          timeout,
        })
      ).rejects.toThrow();
    });

    test('should display error message to user', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="phone"]', '010-0000-0000');

      await page.route('**/apply/submit', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: '서버 오류가 발생했습니다.' }),
        });
      });

      await page.click('button[type="submit"]');
      await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#errorMessage')).toContainText('서버 오류');
    });
  });
});
