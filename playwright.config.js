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
  workers: process.env.CI ? 1 : 2,
  reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]],

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
    },
  },

  use: {
    // SKIP_WEBSERVER: no local server is launched, so target PLAYWRIGHT_BASE_URL
    // (or production) directly. Otherwise a local webServer IS launched below, so
    // baseURL MUST point at it (localhost:8787) — both in CI and locally — unless
    // the caller explicitly overrides with PLAYWRIGHT_BASE_URL. Previously the
    // local (non-CI) branch fell back to production, so the launched webServer was
    // started but never exercised by the tests.
    baseURL: process.env.SKIP_WEBSERVER
      ? process.env.PLAYWRIGHT_BASE_URL || 'https://resume.jclee.me'
      : process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8787',
    // Force the Korean locale so '/' is not redirected to '/en/'. The data.json
    // fixtures the specs assert against are the Korean source of truth.
    locale: 'ko-KR',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9' },
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
          // Serve the DEPLOYED entrypoint (wrangler.jsonc main = entry.js), not
          // the portfolio worker.js directly, so local E2E exercises the real
          // edge router (locale routing, /sw.js cache headers, applyResponseHeaders).
          // Run from repo root so wrangler.jsonc's build command
          // (`npm run build`, cwd ".") resolves the root-only sync/build chain.
          command: 'npx wrangler dev --config apps/portfolio/wrangler.jsonc --port 8787 --local',
          port: 8787,
          reuseExistingServer: !process.env.CI,
          // wrangler.jsonc's build command runs the root build on startup;
          // allow ample time for the data sync + worker build.
          timeout: 300 * 1000,
        },
      }),
});
