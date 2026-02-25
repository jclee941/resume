/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js', '**/tests/integration/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', 'resume-sync-validation.test.js'],
  collectCoverageFrom: [
    'typescript/portfolio-worker/lib/**/*.js', // Core testable modules
    'typescript/portfolio-worker/logger.js', // Logger utility
    '!typescript/portfolio-worker/lib/entry-router-utils.js', // ESM-only helper covered by runtime tests
    '!typescript/portfolio-worker/lib/loki-logger.js', // Runtime-only (Cloudflare Worker)
    '!typescript/portfolio-worker/lib/metrics.js', // Runtime-only (Cloudflare Worker)
    '!typescript/portfolio-worker/lib/performance-metrics.js', // Browser-only (requires jsdom)
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
