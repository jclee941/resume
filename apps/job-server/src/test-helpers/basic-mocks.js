/**
 * Basic mock utilities for test helpers.
 * @file apps/job-server/src/test-helpers/basic-mocks.js
 */

import { mock } from 'node:test';

// ========================
// Logger Mock
// ========================

/**
 * Create a mock logger with all required methods
 * @returns {Object} Mock logger
 */
export function createMockLogger() {
  return {
    info: mock.fn(() => {}),
    warn: mock.fn(() => {}),
    error: mock.fn(() => {}),
    debug: mock.fn(() => {}),
    log: mock.fn(() => {}),
    _calls: [],
  };
}

/**
 * Create a spy logger that records calls
 * @returns {Object} Spy logger
 */
export function createSpyLogger() {
  const calls = [];
  return {
    info: mock.fn((...args) => calls.push({ level: 'info', args })),
    warn: mock.fn((...args) => calls.push({ level: 'warn', args })),
    error: mock.fn((...args) => calls.push({ level: 'error', args })),
    debug: mock.fn((...args) => calls.push({ level: 'debug', args })),
    log: mock.fn((...args) => calls.push({ level: 'log', args })),
    _calls: calls,
    _getCalls: () => calls,
  };
}

// ========================
// Environment Mock
// ========================

/**
 * Create mock environment variables
 * @param {Record<string, string>} [overrides]
 * @returns {Object} Mock env
 */
export function createMockEnv(overrides = {}) {
  return {
    WANTED_COOKIES: overrides.WANTED_COOKIES || 'mock_wanted_cookies',
    WANTED_EMAIL: overrides.WANTED_EMAIL || 'test@example.com',
    WANTED_PASSWORD: overrides.WANTED_PASSWORD || 'test_password',
    WANTED_ONEID_CLIENT_ID: overrides.WANTED_ONEID_CLIENT_ID || 'mock_client_id',
    TELEGRAM_BOT_TOKEN: overrides.TELEGRAM_BOT_TOKEN || '123456:ABC-DEF',
    TELEGRAM_CHAT_ID: overrides.TELEGRAM_CHAT_ID || '-1001234567890',
    CLAUDE_API_KEY: overrides.CLAUDE_API_KEY || 'sk-mock-api-key',
    D1_DB: overrides.D1_DB || 'mock-d1-binding',
    SESSIONS_KV: overrides.SESSIONS_KV || 'mock-sessions-kv',
    RATE_LIMIT_KV: overrides.RATE_LIMIT_KV || 'mock-rate-limit-kv',
    ...overrides,
  };
}

// ========================
// Fetch Mock
// ========================

/**
 * Create a fetch mock with response queue
 * @returns {Object} Fetch mock
 */
export function createMockFetch() {
  /** @type {Array<{pattern: RegExp, response: Object|Function, status?: number}>} */
  const responseQueue = [];

  /**
   * @param {string} pattern - URL pattern to match
   * @param {Object|Function} response - Response object or function returning response
   * @param {number} [status=200] - HTTP status code
   */
  function mockResponse(pattern, response, status = 200) {
    responseQueue.push({
      pattern: typeof pattern === 'string' ? new RegExp(pattern) : pattern,
      response,
      status,
    });
  }

  /**
   * @param {string} url
   * @param {Object} [options]
   * @returns {Promise<{ok: boolean, status: number, json: Function}>}
   */
  async function fetchMock(url, options) {
    for (const entry of responseQueue) {
      if (entry.pattern.test(url)) {
        const response =
          typeof entry.response === 'function' ? entry.response(url, options) : entry.response;
        return {
          ok: entry.status >= 200 && entry.status < 300,
          status: entry.status,
          json: async () => response,
          text: async () => JSON.stringify(response),
        };
      }
    }
    throw new Error(`No mock response for URL: ${url}`);
  }

  fetchMock._mockResponse = mockResponse;
  fetchMock._queue = responseQueue;
  fetchMock.clear = () => {
    responseQueue.length = 0;
  };

  return fetchMock;
}
