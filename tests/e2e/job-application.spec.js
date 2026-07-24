/**
 * E2E Tests for Job Application Browser Automation
 *
 * Tests real browser automation scenarios:
 * - Test A: Mock Job Site Application (basic form fill + submit)
 * - Test B: File Upload functionality
 *
 * Uses local mock server to avoid real job site connections.
 */

const { test, expect } = require('@playwright/test');
const {
  getServer,
  resetApplications,
  waitForApplicationCount,
} = require('./fixtures/mock-job-site');
const {
  SAMPLE_APPLICATION_DATA,
  getSampleResumePath,
} = require('./fixtures/mock-data');

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
    console.log(
      `[Job Application E2E] Mock server ready at ${mockServerUrl} (worker=${testInfo.workerIndex})`
    );
  });

  test.beforeEach(async ({ page: _page }, testInfo) => {
    const count = await resetApplications(mockServerPort);

    console.log(`[Job Application E2E] Reset state before "${testInfo.title}" -> count=${count}`);
    expect(count).toBe(0);
  });

  test.describe('Test A: Mock Job Site Application', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });
    });

    test('should navigate to application form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('지원하기');
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="phone"]')).toBeVisible();
    });

    test('should auto-fill form fields using data-auto-fill attributes', async ({ page }) => {
      const data = SAMPLE_APPLICATION_DATA.personal;

      await page.locator('input[data-auto-fill="name"]').fill(data.name);
      await page.locator('input[data-auto-fill="email"]').fill(data.email);
      await page.locator('input[data-auto-fill="phone"]').fill(data.phone);

      await expect(page.locator('input[name="name"]')).toHaveValue(data.name);
      await expect(page.locator('input[name="email"]')).toHaveValue(data.email);
      await expect(page.locator('input[name="phone"]')).toHaveValue(data.phone);
    });

    test('should fill and submit application successfully', async ({ page }) => {
      const data = SAMPLE_APPLICATION_DATA.personal;

      await page.locator('input[name="name"]').fill(data.name);
      await page.locator('input[name="email"]').fill(data.email);
      await page.locator('input[name="phone"]').fill(data.phone);
      await page.selectOption('select[name="experience"]', '3-5');
      await page
        .locator('textarea[name="coverLetter"]')
        .fill(SAMPLE_APPLICATION_DATA.coverLetter.substring(0, 100));

      const submitResponse = waitForSubmitResponse(page);
      await page.click('button[type="submit"]');

      expect((await submitResponse).ok()).toBe(true);
      await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#applicationId')).not.toBeEmpty();

      await expectApplicationCount(1, 'basic form submission');
    });

    test('should validate required fields before submission', async ({ page }) => {
      await page.click('button[type="submit"]');
    });

    test('should handle job-specific application URL', async ({ page }) => {
      const jobId = 'test-job-456';
      await page.goto(`${mockServerUrl}/jobs/${jobId}`, {
        waitUntil: 'domcontentloaded',
      });

      await expect(page.locator('p:text("Job ID:")')).toContainText(`Job ID: ${jobId}`);
    });
  });

  test.describe('Test B: File Upload', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply`, {
        waitUntil: 'domcontentloaded',
      });
    });

    test('should display file upload area', async ({ page }) => {
      await expect(page.locator('.file-upload')).toBeVisible();
      await expect(page.locator('input[type="file"]')).toBeAttached();
    });

    test('should select and upload resume file', async ({ page }) => {
      const resumePath = getSampleResumePath();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(resumePath);

      await expect(page.locator('#fileInfo')).toContainText('sample-resume.txt');
      const fileCount = await fileInput.inputValue();
      expect(fileCount).toBeTruthy();
    });

    test('should upload file and submit application', async ({ page }) => {
      const resumePath = getSampleResumePath();
      const data = SAMPLE_APPLICATION_DATA.personal;

      await page.locator('input[name="name"]').fill(data.name);
      await page.locator('input[name="email"]').fill(data.email);
      await page.locator('input[name="phone"]').fill(data.phone);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(resumePath);

      await expect(page.locator('#fileInfo')).toContainText('sample-resume.txt');
      const submitResponse = waitForSubmitResponse(page);
      await page.click('button[type="submit"]');

      expect((await submitResponse).ok()).toBe(true);
      await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });

      await expectApplicationCount(1, 'resume upload submission');
    });

    test('should show file info after selection', async ({ page }) => {
      const resumePath = getSampleResumePath();

      await expect(page.locator('#fileInfo')).toBeEmpty();
      await page.locator('input[type="file"]').setInputFiles(resumePath);
      await expect(page.locator('#fileInfo')).not.toBeEmpty();
      await expect(page.locator('#fileInfo')).toContainText('sample-resume.txt');
    });
  });
});
