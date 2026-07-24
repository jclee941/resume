import { createTestServices } from './service-setup.js';

// ========================
// Test Context Helper
// ========================

/**
 * Create test context with common utilities
 * @param {Object} [options]
 * @returns {Object} Test context
 */
export function createTestContext(options = {}) {
  const context = {
    /** @type {number} */
    testStartTime: Date.now(),

    /** @type {Array} */
    errors: [],

    /** @type {Object} */
    services: createTestServices(options),

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
        context.services.logger.error(`[TEST STEP] ${name} - ERROR:`, error.message);
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
