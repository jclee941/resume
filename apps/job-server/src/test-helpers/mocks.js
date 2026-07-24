/**
 * Mock utilities - Reusable mock factories for auto-apply tests
 * @file apps/job-server/src/test-helpers/mocks.js
 */

import {
  createMockLogger,
  createSpyLogger,
  createMockEnv,
  createMockFetch,
} from './basic-mocks.js';
import { createMockD1Client } from './database-mock.js';
import { createMockRepository } from './repository-mock.js';
import { mockTelegramAPI, mockClaudeAPI } from './service-mocks.js';
import { mockWantedAPI } from './wanted-api-mock.js';

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
};

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
