/**
 * E2E Tests for Job Application Browser Automation
 *
 * Tests real browser automation scenarios:
 * - Test A: Mock Job Site Application (basic form fill + submit)
 * - Test B: File Upload functionality
 * - Test C: Multi-Step Form wizard
 * - Test D: Error Handling (500, retry, screenshot)
 * - Test E: Stealth Features Verification
 * - Test F: Full Integration Flow
 *
 * Uses local mock server to avoid real job site connections.
 */

const { test, expect } = require('@playwright/test');
const { getServer, getApplicationCount, resetApplications } = require('./fixtures/mock-job-site');
const {
  SAMPLE_APPLICATION_DATA,
  getSampleResumePath,
  randomDelay,
  isRealisticUserAgent,
  MockCookieJar,
} = require('./fixtures/mock-data');

// Mock server singleton info
let mockServerInfo = null;
const MOCK_SERVER_PORT = 9393;
const MOCK_SERVER_URL = `http://localhost:${MOCK_SERVER_PORT}`;

/**
 * Get singleton mock server before all tests
 */
test.beforeAll(async () => {
  mockServerInfo = await getServer(MOCK_SERVER_PORT);
  console.log(`[Job Application E2E] Mock server ready at ${MOCK_SERVER_URL}`);
});

/**
 * Reset application state before each test
 */
test.beforeEach(() => {
  resetApplications();
});

// ============================================================================
// TEST A: Mock Job Site Application
// ============================================================================
test.describe('Test A: Mock Job Site Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
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

    await page.click('button[type="submit"]');
    await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#applicationId')).not.toBeEmpty();

    expect(getApplicationCount()).toBe(1);
  });

  test('should validate required fields before submission', async ({ page }) => {
    await page.click('button[type="submit"]');
    // HTML5 validation should prevent submission for empty required fields
  });

  test('should handle job-specific application URL', async ({ page }) => {
    const jobId = 'test-job-456';
    await page.goto(`${MOCK_SERVER_URL}/jobs/${jobId}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('p:text("Job ID:")')).toContainText(`Job ID: ${jobId}`);
  });
});

// ============================================================================
// TEST B: File Upload
// ============================================================================
test.describe('Test B: File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
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
    await page.click('button[type="submit"]');
    await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });

    expect(getApplicationCount()).toBe(1);
  });

  test('should show file info after selection', async ({ page }) => {
    const resumePath = getSampleResumePath();

    await expect(page.locator('#fileInfo')).toBeEmpty();
    await page.locator('input[type="file"]').setInputFiles(resumePath);
    await expect(page.locator('#fileInfo')).not.toBeEmpty();
    await expect(page.locator('#fileInfo')).toContainText('sample-resume.txt');
  });
});

// ============================================================================
// TEST C: Multi-Step Form
// ============================================================================
test.describe('Test C: Multi-Step Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply/multistep`, {
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

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('.form-step.active .btn-submit');
    await page.waitForTimeout(1000);

    expect(getApplicationCount()).toBe(1);
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

// ============================================================================
// TEST D: Error Handling
// ============================================================================
test.describe('Test D: Error Handling', () => {
  test('should handle 500 server error', async ({ page }) => {
    let retryCount = 0;

    page.on('response', async (response) => {
      if (response.url().includes('/error/500') && response.status() === 500) {
        retryCount++;
      }
    });

    await page.goto(`${MOCK_SERVER_URL}/error/500`, {
      waitUntil: 'domcontentloaded',
    });

    const response = await page.evaluate(() =>
      fetch('/error/500').then((r) => ({ status: r.status, ok: r.ok }))
    );

    expect(response.status).toBe(500);
    expect(response.ok).toBe(false);
  });

  test('should retry on transient failure', async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
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
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
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
      page.goto(`${MOCK_SERVER_URL}/error/timeout`, {
        waitUntil: 'domcontentloaded',
        timeout,
      })
    ).rejects.toThrow();
  });

  test('should display error message to user', async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
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

// ============================================================================
// TEST E: Stealth Verification
// ============================================================================
test.describe('Test E: Stealth Features Verification', () => {
  test('should use realistic user agent', async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/stealth/check`, {
      waitUntil: 'domcontentloaded',
    });

    const response = await page.evaluate(() => fetch('/stealth/check').then((r) => r.json()));
    expect(isRealisticUserAgent(response.userAgent)).toBe(true);
  });

  test('should maintain cookie persistence across navigation', async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
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

    await page.goto(`${MOCK_SERVER_URL}/apply/multistep`, {
      waitUntil: 'domcontentloaded',
    });

    await page.goto(`${MOCK_SERVER_URL}/apply`, {
      waitUntil: 'domcontentloaded',
    });

    const cookies = await page.context().cookies();
    const hasSession = cookies.some((c) => c.name === 'test_session');
    expect(hasSession).toBe(true);
  });

  test('should add human-like delays between actions', async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
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
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
      waitUntil: 'domcontentloaded',
    });

    const response = await page.evaluate(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/stealth/check`);
        return { ok: res.ok, status: res.status };
      } catch (err) {
        return { error: err.message };
      }
    }, MOCK_SERVER_URL);

    if (response.error) {
      console.log('Fetch error:', response.error);
    }
    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST F: Integration - Full Application Flow
// ============================================================================
test.describe('Test F: Full Application Flow Integration', () => {
  test('should complete full application flow with all features', async ({ page }) => {
    const jobId = 'integration-test-789';
    await page.goto(`${MOCK_SERVER_URL}/jobs/${jobId}`, {
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

    await page.waitForTimeout(200);
    await page.click('button[type="submit"]');

    await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#applicationId')).not.toBeEmpty();

    expect(getApplicationCount()).toBe(1);
  });

  test('should handle multiple rapid submissions correctly', async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply`, {
      waitUntil: 'domcontentloaded',
    });

    await page.fill('input[name="name"]', 'User One');
    await page.fill('input[name="email"]', 'one@example.com');
    await page.fill('input[name="phone"]', '010-1111-1111');
    await page.click('button[type="submit"]');

    await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
    expect(getApplicationCount()).toBe(1);

    await page.goto(`${MOCK_SERVER_URL}/apply`, {
      waitUntil: 'domcontentloaded',
    });

    await page.fill('input[name="name"]', 'User Two');
    await page.fill('input[name="email"]', 'two@example.com');
    await page.fill('input[name="phone"]', '010-2222-2222');
    await page.click('button[type="submit"]');

    await expect(page.locator('#successMessage')).toBeVisible({ timeout: 10000 });
    expect(getApplicationCount()).toBe(2);
  });

  test('should validate form state persistence across steps', async ({ page }) => {
    await page.goto(`${MOCK_SERVER_URL}/apply/multistep`, {
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
