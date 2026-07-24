/**
 * External service mock utilities for test helpers.
 * @file apps/job-server/src/test-helpers/service-mocks.js
 */

// ========================
// Telegram API Mock
// ========================

/**
 * Create a mock Telegram API client
 * @param {Object} [config]
 * @returns {Object} Telegram mock
 */
export function mockTelegramAPI(_config = {}) {
  const responses = [];
  let shouldFail = false;
  let failError = new Error('Telegram API error');

  const api = {
    /**
     * @param {string} chatId
     * @param {string} text
     * @returns {Promise<Object>}
     */
    async sendMessage(chatId, text) {
      if (shouldFail) throw failError;
      const response = {
        ok: true,
        result: {
          message_id: Date.now(),
          chat: { id: chatId },
          text,
          date: Math.floor(Date.now() / 1000),
        },
      };
      responses.push({ method: 'sendMessage', chatId, text, response });
      return response;
    },

    /**
     * @param {string} chatId
     * @param {string} photo
     * @param {string} caption
     * @returns {Promise<Object>}
     */
    async sendPhoto(chatId, photo, caption) {
      if (shouldFail) throw failError;
      const response = {
        ok: true,
        result: {
          message_id: Date.now(),
          chat: { id: chatId },
          photo,
          caption,
          date: Math.floor(Date.now() / 1000),
        },
      };
      responses.push({ method: 'sendPhoto', chatId, photo, caption, response });
      return response;
    },

    /**
     * Simulate API failure
     * @param {boolean} [fail]
     * @param {Error} [error]
     */
    setFailure(fail = true, error = new Error('Telegram API error')) {
      shouldFail = fail;
      failError = error;
    },

    /** @returns {Array} */
    getResponses() {
      return responses;
    },

    /** Clear responses */
    clearResponses() {
      responses.length = 0;
    },
  };

  return api;
}

// ========================
// Claude API Mock
// ========================

/**
 * Create a mock Claude API client
 * @param {Object} [config]
 * @returns {Object} Claude mock
 */
export function mockClaudeAPI(_config = {}) {
  const calls = [];
  let shouldFail = false;
  let failError = new Error('Claude API error');
  let nextResponse = null;

  const api = {
    /**
     * @param {string} prompt
     * @param {Object} [options]
     * @returns {Promise<string>}
     */
    async complete(prompt, options = {}) {
      if (shouldFail) throw failError;
      calls.push({ method: 'complete', prompt, options });

      if (nextResponse) {
        const response = nextResponse;
        nextResponse = null;
        return response;
      }

      return 'Mock Claude response';
    },

    /**
     * @param {string} system
     * @param {string} prompt
     * @param {Object} [options]
     * @returns {Promise<string>}
     */
    async completeWithSystem(system, prompt, options = {}) {
      if (shouldFail) throw failError;
      calls.push({ method: 'completeWithSystem', system, prompt, options });
      return 'Mock Claude response with system';
    },

    /**
     * @param {string} text
     * @returns {Promise<Object|null>}
     */
    async analyzeText(text) {
      if (shouldFail) throw failError;
      calls.push({ method: 'analyzeText', text });
      return {
        sentiment: 'neutral',
        keywords: ['DevOps', 'Kubernetes'],
        summary: 'Text analysis complete',
      };
    },

    /**
     * Set next response
     * @param {string} response
     */
    setNextResponse(response) {
      nextResponse = response;
    },

    /**
     * Simulate API failure
     * @param {boolean} [fail]
     * @param {Error} [error]
     */
    setFailure(fail = true, error = new Error('Claude API error')) {
      shouldFail = fail;
      failError = error;
    },

    /** @returns {Array} */
    getCalls() {
      return calls;
    },

    /** Clear calls */
    clearCalls() {
      calls.length = 0;
    },
  };

  return api;
}
