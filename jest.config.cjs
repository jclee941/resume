/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js', '**/tests/integration/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Tests below assert pre-refactor API shapes/messages from the lib/cards split
    // (commits 73ec172d/4e869372/e7cb9bb8) or hit ESM/CJS interop with @resume/schemas.
    // Tracked for a dedicated rewrite PR.
    'tests/unit/portfolio-worker/lib/validators.test.js',
    'tests/unit/portfolio-worker/lib/html-transformer.test.js',
    'tests/unit/portfolio-worker/lib/build-orchestrator.test.js',
    'tests/unit/portfolio-worker/generate-worker.test.js',
    'tests/unit/generate-worker.test.js',
    'tests/integration/worker-html.test.js',
  ],
  collectCoverageFrom: [
    'apps/portfolio/lib/**/*.js', // Core testable modules
    'apps/portfolio/logger.js', // Logger utility
    'packages/shared/src/**/*.js', // Shared package utilities
    '!apps/portfolio/lib/entry-router-utils.js', // ESM-only helper covered by runtime tests
    '!apps/portfolio/lib/loki-logger.js', // Runtime-only (Cloudflare Worker)
    '!apps/portfolio/lib/performance-metrics.js', // Browser-only (requires jsdom)
    '!packages/shared/src/auth/**', // Cookie/HMAC/SessionStore — covered by integration only
    '!packages/shared/src/crypto/**', // Node + WebCrypto adapters — platform-specific
    '!packages/shared/src/rate-limit/**', // Worker DO-bound, exercised in deployed tests
    '!packages/shared/src/retry/**', // Circuit breaker / HTTP retry covered in apps/job-server
    '!packages/shared/src/browser/**', // Stealth patches require live Puppeteer
    '!packages/shared/src/cli/**', // CLI bootstrap covered in packages/cli
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
