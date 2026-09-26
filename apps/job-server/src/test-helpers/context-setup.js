import { createTestServices } from './service-setup.js';

// ========================
// Test Context Helper
// ========================

/**
 * @typedef {{
 *   info: { (...args: unknown[]): void, mock: { calls: unknown[][] } },
 *   error: { (...args: unknown[]): void, mock: { calls: unknown[][] } },
 *   warn?: { (...args: unknown[]): void, mock: { calls: unknown[][] } },
 *   debug?: { (...args: unknown[]): void, mock: { calls: unknown[][] } },
 * }} MockTestLogger
 *
 * @typedef {import('./service-setup.js').TestServices & {
 *   logger: MockTestLogger,
 *   fetch: { mock?: { calls?: unknown[][] } },
 * }} TestContextServices
 */

/**
 * Create test context with common utilities
 * @param {import('./service-setup.js').TestServicesOptions} [options]
 * @returns {Object} Test context
 */
export function createTestContext(options = {}) {
  const context = {
    /** @type {number} */
    testStartTime: Date.now(),

    /** @type {Array<{ step?: string, type?: string, error: unknown }>} */
    errors: [],

    /** @type {TestContextServices} */
    services: /** @type {TestContextServices} */ (createTestServices(options)),

    /**
     * Log test step
     * @param {string} name
     * @param {Function} fn
     * @returns {Promise<*>}
     */
    async runStep(name, fn) {
      context.services.logger.info(`[TEST STEP] ${name}`);
      try {
        const result = await fn();
        context.services.logger.info(`[TEST STEP] ${name} - OK`);
        return result;
      } catch (error) {
        context.errors.push({ step: name, error });
        context.services.logger.error(
          `[TEST STEP] ${name} - ERROR:`,
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }
    },

    /**
     * Assert with context
     * @param {*} actual
     * @param {*} expected
     * @param {string} [message]
     */
    assert(actual, expected, message) {
      if (actual !== expected) {
        const error = new Error(
          `Assertion failed${message ? `: ${message}` : ''}\nExpected: ${expected}\nActual: ${actual}`
        );
        context.errors.push({ type: 'assertion', error });
        throw error;
      }
    },

    /**
     * Get test duration in ms
     * @returns {number}
     */
    getDuration() {
      return Date.now() - context.testStartTime;
    },

    /**
     * Generate test report
     * @returns {Object}
     */
    getReport() {
      return {
        duration: context.getDuration(),
        errorCount: context.errors.length,
        errors: context.errors,
        services: {
          loggerCalls: context.services.logger.info.mock.calls.length,
          fetchCalls: context.services.fetch.mock?.calls?.length || 0,
        },
      };
    },
  };

  return context;
}
