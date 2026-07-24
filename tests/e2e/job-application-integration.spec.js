const { test, expect } = require('@playwright/test');
const {
  getServer,
  resetApplications,
  waitForApplicationCount,
} = require('./fixtures/mock-job-site');
const { SAMPLE_APPLICATION_DATA, getSampleResumePath } = require('./fixtures/mock-data');

const MOCK_SERVER_BASE_PORT = 9393;
let mockServerPort = MOCK_SERVER_BASE_PORT;
let mockServerUrl = `http://localhost:${mockServerPort}`;

test.describe.serial('Job Application Browser Automation', () => {
  async function waitForSubmitResponse(page) {
    return page.waitForResponse(
      (response) =>
        response.url() === `${mockServerUrl}/apply/submit` && response.request().method() === 'POST'
    );
  }

  async function expectApplicationCount(expectedCount, label) {
    const actualCount = await waitForApplicationCount(expectedCount, {
      port: mockServerPort,
    });
    console.log(`[Job Application E2E] ${label} application count=${actualCount}`);
    expect(actualCount).toBe(expectedCount);
  }

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

  test.describe('Test F: Full Application Flow Integration', () => {
    test('should complete full application flow with all features', async ({ page }) => {
      const jobId = 'integration-test-789';
      await page.goto(`${mockServerUrl}/jobs/${jobId}`, {
        waitUntil: 'domcontentloaded',
      });

      await expect(page.locator('h1')).toContainText('지원하기');
      await expect(page.locator('p:text("Job ID:")')).toContainText(`Job ID: ${jobId}`);

      const personal = SAMPLE_APPLICATION_DATA.personal;
      await page.fill('input[name="name"]', personal.name);
      await page.fill('input[name="email"]', personal.email);
      await page.fill('input[name="phone"]', personal.phone);
      await page.selectOption('select[name="experience"]', '5-10');
      await page.locator('textarea[name="coverLetter"]').fill(SAMPLE_APPLICATION_DATA.coverLetter);

      const resumePath = getSampleResumePath();
      await page.locator('input[type="file"]').setInputFiles(resumePath);
      await expect(page.locator('#fileInfo')).toContainText('sample-resume.txt');

      const submitResponse = waitForSubmitResponse(page);
      await page.click('button[type="submit"]');

      expect((await submitResponse).ok()).toBe(true);
      await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#applicationId')).not.toBeEmpty();

      await expectApplicationCount(1, 'integration flow submission');
    });

    test('should handle multiple rapid submissions correctly', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      await page.fill('input[name="name"]', 'User One');
      await page.fill('input[name="email"]', 'one@example.com');
      await page.fill('input[name="phone"]', '010-1111-1111');
      let submitResponse = waitForSubmitResponse(page);
      await page.click('button[type="submit"]');

      expect((await submitResponse).ok()).toBe(true);
      await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
      await expectApplicationCount(1, 'rapid submission #1');

      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });

      await page.fill('input[name="name"]', 'User Two');
      await page.fill('input[name="email"]', 'two@example.com');
      await page.fill('input[name="phone"]', '010-2222-2222');
      submitResponse = waitForSubmitResponse(page);
      await page.click('button[type="submit"]');

      expect((await submitResponse).ok()).toBe(true);
      await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
      await expectApplicationCount(2, 'rapid submission #2');
    });

    test('should validate form state persistence across steps', async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply/multistep`, {
        waitUntil: 'domcontentloaded',
      });

      await page.fill('input[name="name"]', 'Persistence Test');
      await page.fill('input[name="email"]', 'persist@test.com');
      await page.fill('input[name="phone"]', '010-9999-9999');

      await page.click('.btn-next');
      await expect(page.locator('.form-step[data-step="2"]')).toHaveClass(/active/);

      await page.click('.btn-prev');
      await expect(page.locator('.form-step[data-step="1"]')).toHaveClass(/active/);

      await expect(page.locator('input[name="name"]')).toHaveValue('Persistence Test');
      await expect(page.locator('input[name="email"]')).toHaveValue('persist@test.com');
      await expect(page.locator('input[name="phone"]')).toHaveValue('010-9999-9999');
    });
  });
});
