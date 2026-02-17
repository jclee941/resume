// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
    },
  },

  use: {
    // When SKIP_WEBSERVER is set, use PLAYWRIGHT_BASE_URL (for testing against production)
    // Otherwise in CI, use local server; locally use env var or production
    baseURL: process.env.SKIP_WEBSERVER
      ? process.env.PLAYWRIGHT_BASE_URL || 'https://resume.jclee.me'
      : process.env.CI
        ? 'http://localhost:8787'
        : process.env.PLAYWRIGHT_BASE_URL || 'https://resume.jclee.me',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Mobile devices for responsive testing (using Chromium)
    {
      name: 'mobile-iphone-se',
      use: {
        ...devices['Desktop Chrome'],
        ...devices['iPhone SE'],
        browserName: 'chromium',
      },
      testMatch: /mobile\.spec\.js/,
    },
    {
      name: 'mobile-iphone-12',
      use: {
        ...devices['Desktop Chrome'],
        ...devices['iPhone 12 Pro'],
        browserName: 'chromium',
      },
      testMatch: /mobile\.spec\.js/,
    },
    {
      name: 'mobile-pixel',
      use: {
        ...devices['Desktop Chrome'],
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
      testMatch: /mobile\.spec\.js/,
    },
    {
      name: 'mobile-ipad',
      use: {
        ...devices['Desktop Chrome'],
        ...devices['iPad'],
        browserName: 'chromium',
      },
      testMatch: /mobile\.spec\.js/,
    },
  ],

  ...(process.env.SKIP_WEBSERVER
    ? {}
    : {
        webServer: {
          command: 'npm run start --workspace=typescript/portfolio-worker -- --port 8787',
          port: 8787,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }),
});
