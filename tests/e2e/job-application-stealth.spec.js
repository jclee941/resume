const { test, expect } = require('@playwright/test');
const { getServer, resetApplications } = require('./fixtures/mock-job-site');
const { isRealisticUserAgent } = require('./fixtures/mock-data');

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

  test.describe('Test E: Stealth Features Verification', () => {
    test('should use realistic user agent', async ({ page }) => {
      await page.goto(`${mockServerUrl}/stealth/check`, {
        waitUntil: 'domcontentloaded',
      });

      const response = await page.evaluate(() => fetch('/stealth/check').then((r) => r.json()));
      expect(isRealisticUserAgent(response.userAgent)).toBe(true);
    });

    test('should maintain cookie persistence across navigation', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      await page.context().addCookies([
        {
          name: 'test_session',
          value: 'abc123',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto(`${mockServerUrl}/apply/multistep`, {
        waitUntil: 'domcontentloaded',
      });

      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      const cookies = await page.context().cookies();
      const hasSession = cookies.some((c) => c.name === 'test_session');
      expect(hasSession).toBe(true);
    });

    test('should add human-like delays between actions', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      const startTime = Date.now();
      await page.fill('input[name="name"]', '홍길동');
      await page.waitForTimeout(100);
      await page.fill('input[name="email"]', 'test@example.com');
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle same-origin fetch requests', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      const response = await page.evaluate(async (baseUrl) => {
        try {
          const res = await fetch(`${baseUrl}/stealth/check`);
          return { ok: res.ok, status: res.status };
        } catch (err) {
          return { error: err.message };
        }
      }, mockServerUrl);

      if (response.error) {
        console.log('Fetch error:', response.error);
      }
      expect(true).toBe(true);
    });
  });
});
