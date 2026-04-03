/**
 * Test helpers - Export all test utilities for auto-apply tests
 * @file apps/job-server/src/test-helpers/index.js
 */

// ========================
// Fixtures
// ========================

export {
  // Mock data
  mockJobs,
  mockJobsHighScore,
  mockJobsMediumScore,
  mockJobsLowScore,
  mockJobsWanted,
  mockJobsJobKorea,
  mockJobsSaramin,

  // Resume data
  mockResumeData,

  // Applications
  mockApplications,
  createMockApplication,

  // Cover letters
  mockCoverLetter,
  mockCoverLetters,

  // API responses
  mockTelegramResponse,
  mockTelegramErrorResponse,
  mockTelegramSendMessageResponse,
  mockWantedResponse,
  mockWantedSearchResponse,
  mockWantedAuthResponse,
  mockWantedErrorResponse,

  // Timeline events
  mockTimelineEvents,
} from './fixtures.js';

// ========================
// Mocks
// ========================

export {
  createMockLogger,
  createSpyLogger,
  createMockEnv,
  createMockFetch,
  createMockD1Client,
  createMockRepository,
  mockTelegramAPI,
  mockClaudeAPI,
  mockWantedAPI,
} from './mocks.js';

// ========================
// Setup
// ========================

export {
  setupTestDatabase,
  createTestServices,
  createTestAutoApplier,
  createTestJobFilter,
  setupIntegrationTest,
  createTestContext,
} from './setup.js';

// ========================
// Re-export fixtures as default for convenience
// ========================

import * as fixtures from './fixtures.js';
import * as mocks from './mocks.js';
import * as setup from './setup.js';

/**
 * @typedef {Object} TestHelpers
 * @property {typeof fixtures} fixtures
 * @property {typeof mocks} mocks
 * @property {typeof setup} setup
 */

/** @type {TestHelpers} */
const testHelpers = {
  fixtures,
  mocks,
  setup,
};

export default testHelpers;
