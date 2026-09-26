import {
  createMockD1Client,
  createMockFetch,
  createMockLogger,
  createMockEnv,
  createMockRepository,
  mockTelegramAPI,
  mockClaudeAPI,
  mockWantedAPI,
} from './mocks.js';

// ========================
// Service Creation
// ========================

/**
 * @typedef {Object} TestServiceMocks
 * @property {ReturnType<typeof createMockLogger>} logger
 * @property {ReturnType<typeof createMockD1Client>} d1Client
 * @property {ReturnType<typeof createMockFetch>} fetch
 * @property {ReturnType<typeof mockTelegramAPI>} telegram
 * @property {ReturnType<typeof mockClaudeAPI>} claude
 * @property {ReturnType<typeof mockWantedAPI>} wanted
 */

/**
 * @typedef {Object} TestServicesOptions
 * @property {ReturnType<typeof createMockLogger>} [logger]
 * @property {ReturnType<typeof createMockD1Client>} [d1Client]
 * @property {ReturnType<typeof createMockFetch>} [fetch]
 * @property {ReturnType<typeof createMockEnv>} [env]
 * @property {ReturnType<typeof createMockRepository>} [repository]
 * @property {ReturnType<typeof mockTelegramAPI>} [telegram]
 * @property {ReturnType<typeof mockClaudeAPI>} [claude]
 * @property {ReturnType<typeof mockWantedAPI>} [wanted]
 */

/**
 * @typedef {Object} TestServices
 * @property {ReturnType<typeof createMockLogger>} logger
 * @property {ReturnType<typeof createMockD1Client>} d1Client
 * @property {ReturnType<typeof createMockFetch>} fetch
 * @property {ReturnType<typeof createMockEnv>} env
 * @property {ReturnType<typeof createMockRepository>} repository
 * @property {ReturnType<typeof mockTelegramAPI>} telegram
 * @property {ReturnType<typeof mockClaudeAPI>} claude
 * @property {ReturnType<typeof mockWantedAPI>} wanted
 * @property {() => TestServiceMocks} getMocks
 */

/**
 * Create service instances with mocks
 * @param {TestServicesOptions} [options]
 * @returns {TestServices} Service instances
 */
export function createTestServices(options = {}) {
  const logger = options.logger || createMockLogger();
  const d1Client = options.d1Client || createMockD1Client();
  const fetch = options.fetch || createMockFetch();
  const env = options.env || createMockEnv();
  const repository = options.repository || createMockRepository();

  const telegramMock = options.telegram || mockTelegramAPI();
  const claudeMock = options.claude || mockClaudeAPI();
  const wantedMock = options.wanted || mockWantedAPI();

  return {
    logger,
    d1Client,
    fetch,
    env,
    repository,
    telegram: telegramMock,
    claude: claudeMock,
    wanted: wantedMock,

    /**
     * Get all mocks
     * @returns {TestServiceMocks}
     */
    getMocks() {
      return {
        logger,
        d1Client,
        fetch,
        telegram: telegramMock,
        claude: claudeMock,
        wanted: wantedMock,
      };
    },
  };
}
