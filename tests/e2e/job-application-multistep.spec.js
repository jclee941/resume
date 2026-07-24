const { test, expect } = require('@playwright/test');
const {
  getServer,
  resetApplications,
  waitForApplicationCount,
} = require('./fixtures/mock-job-site');
const { SAMPLE_APPLICATION_DATA } = require('./fixtures/mock-data');

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

  test.describe('Test C: Multi-Step Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${mockServerUrl}/apply/multistep`, {
        waitUntil: 'domcontentloaded',
      });
    });

    test('should display step indicator with 4 steps', async ({ page }) => {
      const steps = page.locator('.step-indicator .step');
      await expect(steps).toHaveCount(4);
      await expect(steps.first()).toHaveClass(/active/);
    });

    test('should complete step 1 (Personal Info)', async ({ page }) => {
      const data = SAMPLE_APPLICATION_DATA.personal;

      await page.fill('input[name="name"]', data.name);
      await page.fill('input[name="email"]', data.email);
      await page.fill('input[name="phone"]', data.phone);
      await page.click('.form-step.active .btn-next');

      await expect(page.locator('.form-step[data-step="2"]')).toHaveClass(/active/);
    });

    test('should complete step 2 (Education)', async ({ page }) => {
      const data = SAMPLE_APPLICATION_DATA.education;

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="phone"]', '010-0000-0000');
      await page.click('.form-step.active .btn-next');

      await page.fill('input[name="school"]', data.school);
      await page.fill('input[name="major"]', data.major);
      await page.selectOption('select[name="degree"]', data.degree);
      await page.click('.form-step.active .btn-next');

      await expect(page.locator('.form-step[data-step="3"]')).toHaveClass(/active/);
    });

    test('should complete step 3 (Experience)', async ({ page }) => {
      const data = SAMPLE_APPLICATION_DATA.experience;

      await page.fill('input[name="name"]', 'Test');
      await page.fill('input[name="email"]', 't@t.com');
      await page.fill('input[name="phone"]', '010-0000-0000');
      await page.click('.form-step.active .btn-next');
      await page.fill('input[name="school"]', 'Test Univ');
      await page.fill('input[name="major"]', 'CS');
      await page.click('.form-step.active .btn-next');

      await page.fill('input[name="company"]', data.company);
      await page.fill('input[name="position"]', data.position);
      await page.fill('input[name="skills"]', data.skills);
      await page.click('.form-step.active .btn-next');

      await expect(page.locator('.form-step[data-step="4"]')).toHaveClass(/active/);
    });

    test('should navigate back from step 2 to step 1', async ({ page }) => {
      await page.fill('input[name="name"]', 'Test');
      await page.fill('input[name="email"]', 't@t.com');
      await page.fill('input[name="phone"]', '010-0000-0000');
      await page.click('.form-step.active .btn-next');

      await expect(page.locator('.form-step[data-step="2"]')).toHaveClass(/active/);
      await page.click('.form-step.active .btn-prev');

      await expect(page.locator('.form-step[data-step="1"]')).toHaveClass(/active/);
      await expect(page.locator('.form-step[data-step="1"]')).toHaveClass(/active/);
    });

    test('should review and submit from step 4', async ({ page }) => {
      const personal = SAMPLE_APPLICATION_DATA.personal;
      const education = SAMPLE_APPLICATION_DATA.education;
      const experience = SAMPLE_APPLICATION_DATA.experience;

      await page.fill('input[name="name"]', personal.name);
      await page.fill('input[name="email"]', personal.email);
      await page.fill('input[name="phone"]', personal.phone);
      await page.click('.form-step.active .btn-next');

      await page.fill('input[name="school"]', education.school);
      await page.fill('input[name="major"]', education.major);
      await page.click('.form-step.active .btn-next');

      await page.fill('input[name="company"]', experience.company);
      await page.fill('input[name="position"]', experience.position);
      await page.fill('input[name="skills"]', experience.skills);
      await page.click('.form-step.active .btn-next');

      await expect(page.locator('.form-step[data-step="4"]')).toHaveClass(/active/);
      await expect(page.locator('#reviewName')).toContainText(personal.name);
      await expect(page.locator('#reviewEmail')).toContainText(personal.email);
      await expect(page.locator('#reviewSchool')).toContainText(education.school);
      await expect(page.locator('.form-step.active .btn-submit')).toBeVisible();

      const submitResponse = waitForSubmitResponse(page);
      const dialogPromise = page.waitForEvent('dialog');

      await page.click('.form-step.active .btn-submit');

      expect((await submitResponse).ok()).toBe(true);
      await (await dialogPromise).accept();
      await expectApplicationCount(1, 'multi-step submission');
    });

    test('should show submit button only on final step', async ({ page }) => {
      await expect(page.locator('.btn-submit')).not.toBeVisible();

      await page.fill('input[name="name"]', 'Test');
      await page.fill('input[name="email"]', 't@t.com');
      await page.fill('input[name="phone"]', '010-0000-0000');
      await page.click('.form-step.active .btn-next');
      await page.click('.form-step.active .btn-next');
      await page.click('.form-step.active .btn-next');

      await expect(page.locator('.btn-submit')).toBeVisible();
    });
  });
});
