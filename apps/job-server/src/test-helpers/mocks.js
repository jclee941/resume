/**
 * Mock utilities - Reusable mock factories for auto-apply tests
 * @file apps/job-server/src/test-helpers/mocks.js
 */

import { mock } from 'node:test';
import { mockJobs, mockResumeData, mockTelegramResponse, mockWantedResponse } from './fixtures.js';

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
  fetchMock.clear = () => (responseQueue.length = 0);

  return fetchMock;
}

// ========================
// D1 Client Mock
// ========================

/**
 * Create an in-memory D1 mock client
 * @returns {Object} D1 mock client
 */
export function createMockD1Client() {
  /** @type {Map<string, Array<Object>>} */
  const tables = new Map();
  tables.set('applications', []);
  tables.set('application_timeline', []);
  tables.set('approval_requests', []);

  /** @type {Array<Object>} */
  const queries = [];

  return {
    tables,
    queries,

    /**
     * @param {string} sql
     * @param {Array} [params]
     * @returns {Promise<Array>}
     */
    async query(sql, params = []) {
      queries.push({ sql, params });
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

      if (normalized.startsWith('insert into applications')) {
        const row = {
          id: params[0],
          job_id: params[1],
          source: params[2],
          source_url: params[3],
          position: params[4],
          company: params[5],
          location: params[6],
          match_score: params[7],
          status: params[8],
          priority: params[9],
          resume_id: params[10],
          cover_letter: params[11],
          notes: params[12],
          created_at: params[13],
          updated_at: params[14],
          applied_at: params[15],
          workflow_id: params[16],
          approved_at: params[17],
          rejected_at: params[18],
        };
        tables.get('applications').push(row);
        return { results: [] };
      }

      if (normalized.startsWith('insert into application_timeline')) {
        const row = {
          id: `tl-${Date.now()}`,
          application_id: params[0],
          status: params[1],
          previous_status: params[2],
          note: params[3],
          timestamp: params[4],
        };
        tables.get('application_timeline').push(row);
        return { results: [] };
      }

      if (normalized.startsWith('select * from applications')) {
        const rows = tables.get('applications');
        return { results: rows };
      }

      if (normalized.startsWith('select * from application_timeline')) {
        const appIdMatch = sql.match(/application_id\s*=\s*@?(\?|\$[0-9]+)/i);
        if (appIdMatch) {
          const rows = tables.get('application_timeline');
          return { results: rows };
        }
        return { results: tables.get('application_timeline') };
      }

      return { results: [] };
    },

    /**
     * @param {string} table
     * @returns {Array}
     */
    getTable(table) {
      return tables.get(table) || [];
    },

    /**
     * Reset all tables
     */
    reset() {
      tables.get('applications').length = 0;
      tables.get('application_timeline').length = 0;
      tables.get('approval_requests').length = 0;
      queries.length = 0;
    },

    /**
     * Seed table with data
     * @param {string} table
     * @param {Array} data
     */
    seed(table, data) {
      tables.set(table, [...data]);
    },
  };
}

// ========================
// Repository Mock
// ========================

/**
 * Create a mock application repository
 * @returns {Object} Mock repository
 */
export function createMockRepository() {
  const apps = new Map();
  const timeline = [];

  return {
    d1Client: createMockD1Client(),
    create: mock.fn(async (data) => {
      const id = data.id || `app-${apps.size + 1}`;
      const now = new Date().toISOString();
      const row = {
        id,
        job_id: data.job_id,
        source: data.source,
        source_url: data.source_url || null,
        position: data.position,
        company: data.company,
        location: data.location || null,
        match_score: data.match_score || 0,
        status: data.status || 'discovered',
        priority: data.priority || 'medium',
        resume_id: data.resume_id || null,
        cover_letter: data.cover_letter || null,
        notes: data.notes || null,
        created_at: now,
        updated_at: now,
        applied_at: null,
        workflow_id: null,
        approved_at: null,
        rejected_at: null,
      };
      apps.set(id, row);
      timeline.push({
        application_id: id,
        status: row.status,
        previous_status: null,
        note: 'created',
      });
      return { ...row };
    }),
    findById: mock.fn(async (id) => {
      const row = apps.get(id);
      return row ? { ...row } : null;
    }),
    findByJobId: mock.fn(async (jobId) =>
      [...apps.values()]
        .filter((row) => String(row.job_id) === String(jobId))
        .map((row) => ({ ...row }))
    ),
    update: mock.fn(async (id, patch) => {
      const row = apps.get(id);
      if (!row) return null;
      Object.assign(row, patch, { updated_at: new Date().toISOString() });
      return { ...row };
    }),
    updateStatus: mock.fn(async (id, status, note = '') => {
      const row = apps.get(id);
      if (!row) return null;
      const previous = row.status;
      row.status = status;
      row.updated_at = new Date().toISOString();
      if (note) row.notes = note;
      timeline.push({ application_id: id, status, previous_status: previous, note });
      return { ...row };
    }),
    findTodayApplications: mock.fn(async () => [...apps.values()].map((row) => ({ ...row }))),
    getStats: mock.fn(async () => {
      const rows = [...apps.values()];
      return {
        total: rows.length,
        today: rows.length,
        pendingApprovals: rows.filter(
          (r) => r.status === 'pending' && r.match_score >= 60 && r.match_score <= 74
        ).length,
        averageMatchScore: rows.length
          ? rows.reduce((acc, row) => acc + Number(row.match_score || 0), 0) / rows.length
          : 0,
        byStatus: rows.reduce((acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        }, {}),
        bySource: rows.reduce((acc, row) => {
          acc[row.source] = (acc[row.source] || 0) + 1;
          return acc;
        }, {}),
      };
    }),
    __apps: apps,
    __timeline: timeline,
  };
}

// ========================
// Telegram API Mock
// ========================

/**
 * Create a mock Telegram API client
 * @param {Object} [config]
 * @returns {Object} Telegram mock
 */
export function mockTelegramAPI(config = {}) {
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
export function mockClaudeAPI(config = {}) {
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

// ========================
// Wanted API Mock
// ========================

/**
 * Create a mock Wanted API client
 * @param {Object} [config]
 * @returns {Object} Wanted API mock
 */
export function mockWantedAPI(config = {}) {
  const calls = [];
  let isAuthenticated = true;
  let shouldFail = false;
  let failError = new Error('Wanted API error');

  const api = {
    /**
     * @returns {Promise<Object>}
     */
    async getProfile() {
      if (shouldFail) throw failError;
      calls.push({ method: 'getProfile' });
      return (
        mockWantedResponse.data?.user || {
          id: 12345,
          name: 'Mock User',
          email: 'mock@example.com',
        }
      );
    },

    /**
     * @returns {Promise<Object>}
     */
    async getResumeList() {
      if (shouldFail) throw failError;
      calls.push({ method: 'getResumeList' });
      return {
        data: [{ id: 'AwcICwcLBAFIAgcDCwUAB01F', title: 'Mock Resume', is_default: true }],
      };
    },

    /**
     * @param {string} resumeId
     * @returns {Promise<Object>}
     */
    async getResumeDetail(resumeId) {
      if (shouldFail) throw failError;
      calls.push({ method: 'getResumeDetail', resumeId });
      return {
        resume: {
          id: resumeId,
          title: 'Mock Resume',
          lang: 'ko',
          is_complete: true,
        },
        careers: mockResumeData.careers,
        educations: mockResumeData.educations,
        skills: mockResumeData.skills,
      };
    },

    /**
     * @param {string} jobId
     * @returns {Promise<Object>}
     */
    async getJobDetail(jobId) {
      if (shouldFail) throw failError;
      calls.push({ method: 'getJobDetail', jobId });
      return (
        mockWantedResponse.data?.job || {
          id: jobId,
          title: 'Mock Job',
          company: { name: 'Mock Company' },
        }
      );
    },

    /**
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async searchJobs(params = {}) {
      if (shouldFail) throw failError;
      calls.push({ method: 'searchJobs', params });
      return mockWantedResponse.data || { items: [] };
    },

    /**
     * @param {string} query
     * @param {Object} [params]
     * @returns {Promise<Object>}
     */
    async searchByKeyword(query, params = {}) {
      if (shouldFail) throw failError;
      calls.push({ method: 'searchByKeyword', query, params });
      return mockWantedSearchResponse.data || { items: [] };
    },

    /**
     * @param {string} resumeId
     * @param {Object} coverLetter
     * @returns {Promise<boolean>}
     */
    async submitApplication(resumeId, coverLetter) {
      if (shouldFail) throw failError;
      calls.push({ method: 'submitApplication', resumeId, coverLetter });
      return true;
    },

    /**
     * @param {boolean} authenticated
     */
    setAuthenticated(authenticated) {
      isAuthenticated = authenticated;
    },

    /**
     * Simulate API failure
     * @param {boolean} [fail]
     * @param {Error} [error]
     */
    setFailure(fail = true, error = new Error('Wanted API error')) {
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

    /** @returns {boolean} */
    isAuthenticated() {
      return isAuthenticated;
    },
  };

  return api;
}

// ========================
// Default export
// ========================

export default {
  createMockLogger,
  createSpyLogger,
  createMockEnv,
  createMockFetch,
  createMockD1Client,
  createMockRepository,
  mockTelegramAPI,
  mockClaudeAPI,
  mockWantedAPI,
};
