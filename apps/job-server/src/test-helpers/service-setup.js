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
 * Create service instances with mocks
 * @param {Object} [options]
 * @returns {Object} Service instances
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
     * @returns {Object}
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
