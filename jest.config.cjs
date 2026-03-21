/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js', '**/tests/integration/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', 'resume-sync-validation.test.js'],
  collectCoverageFrom: [
    'apps/portfolio/lib/**/*.js', // Core testable modules
    'apps/portfolio/logger.js', // Logger utility
    '!apps/portfolio/lib/entry-router-utils.js', // ESM-only helper covered by runtime tests
    '!apps/portfolio/lib/loki-logger.js', // Runtime-only (Cloudflare Worker)
    '!apps/portfolio/lib/performance-metrics.js', // Browser-only (requires jsdom)
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
