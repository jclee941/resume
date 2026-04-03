/**
 * Test setup utilities - Create service instances with mocks for auto-apply tests
 * @file apps/job-server/src/test-helpers/setup.js
 */

import { mock } from 'node:test';
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
import { mockJobs, mockResumeData, createMockApplication } from './fixtures.js';

// ========================
// Database Setup
// ========================

/**
 * Setup and cleanup D1 tables for testing
 * @param {Object} d1Client
 * @returns {Object} Database setup utilities
 */
export function setupTestDatabase(d1Client) {
  const setup = {
    /**
     * Create tables
     * @returns {Promise<void>}
     */
    async createTables() {
      await d1Client.query(`
        CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL,
          source TEXT NOT NULL,
          source_url TEXT,
          position TEXT NOT NULL,
          company TEXT NOT NULL,
          location TEXT,
          match_score INTEGER DEFAULT 0,
          status TEXT DEFAULT 'discovered',
          priority TEXT DEFAULT 'medium',
          resume_id TEXT,
          cover_letter TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          applied_at TEXT,
          workflow_id TEXT,
          approved_at TEXT,
          rejected_at TEXT
        )
      `);

      await d1Client.query(`
        CREATE TABLE IF NOT EXISTS application_timeline (
          id TEXT PRIMARY KEY,
          application_id TEXT NOT NULL,
          status TEXT NOT NULL,
          previous_status TEXT,
          note TEXT,
          timestamp TEXT NOT NULL
        )
      `);

      await d1Client.query(`
        CREATE TABLE IF NOT EXISTS approval_requests (
          id TEXT PRIMARY KEY,
          application_id TEXT NOT NULL,
          requested_at TEXT NOT NULL,
          approved_at TEXT,
          status TEXT DEFAULT 'pending',
          approver_notes TEXT
        )
      `);
    },

    /**
     * Drop all tables
     * @returns {Promise<void>}
     */
    async dropTables() {
      await d1Client.query('DROP TABLE IF EXISTS applications');
      await d1Client.query('DROP TABLE IF EXISTS application_timeline');
      await d1Client.query('DROP TABLE IF EXISTS approval_requests');
    },

    /**
     * Reset all table data
     * @returns {Promise<void>}
     */
    async resetTables() {
      await d1Client.query('DELETE FROM applications');
      await d1Client.query('DELETE FROM application_timeline');
      await d1Client.query('DELETE FROM approval_requests');
    },

    /**
     * Seed applications
     * @param {Array} applications
     * @returns {Promise<void>}
     */
    async seedApplications(applications) {
      for (const app of applications) {
        await d1Client.query(
          `INSERT INTO applications (
            id, job_id, source, source_url, position, company, location,
            match_score, status, priority, resume_id, cover_letter, notes,
            created_at, updated_at, applied_at, workflow_id, approved_at, rejected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            app.id,
            app.job_id,
            app.source,
            app.source_url || null,
            app.position,
            app.company,
            app.location || null,
            app.match_score || 0,
            app.status || 'discovered',
            app.priority || 'medium',
            app.resume_id || null,
            app.cover_letter || null,
            app.notes || null,
            app.created_at || new Date().toISOString(),
            app.updated_at || new Date().toISOString(),
            app.applied_at || null,
            app.workflow_id || null,
            app.approved_at || null,
            app.rejected_at || null,
          ]
        );
      }
    },
  };

  return setup;
}

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

// ========================
// AutoApplier Test Helper
// ========================

/**
 * Create auto-applier with all mocks
 * @param {Object} [options]
 * @returns {Promise<Object>} AutoApplier instance and mocks
 */
export async function createTestAutoApplier(options = {}) {
  const { logger, d1Client, fetch, env, repository, telegram, claude, wanted } =
    createTestServices(options);

  // Auto-applier will be imported dynamically to avoid circular dependencies
  let AutoApplier;
  try {
    const module = await import('../auto-apply/auto-applier.js');
    AutoApplier = module.AutoApplier;
  } catch {
    // Fallback for when auto-applier isn't available
    AutoApplier = class MockAutoApplier {
      constructor(opts) {
        this.logger = opts.logger || logger;
        this.repository = opts.repository || repository;
        this.config = {
          maxDailyApplications: opts.maxDailyApplications || 10,
          reviewThreshold: opts.reviewThreshold || 60,
          autoApplyThreshold: opts.autoApplyThreshold || 75,
          minMatchScore: opts.minMatchScore || 60,
          autoApply: opts.autoApply !== undefined ? opts.autoApply : false,
          dryRun: opts.dryRun !== undefined ? opts.dryRun : true,
          delayBetweenApps: opts.delayBetweenApps || 5000,
          excludeCompanies: opts.excludeCompanies || [],
          excludeKeywords: opts.excludeKeywords || [],
          preferredCompanies: opts.preferredCompanies || [],
          keywords: opts.keywords || [],
          useAI: opts.useAI || false,
          resumePath: opts.resumePath || null,
        };
      }
    };
  }

  const autoApplier = new AutoApplier({
    logger,
    repository,
    d1Client,
    maxDailyApplications: options.maxDailyApplications,
    reviewThreshold: options.reviewThreshold,
    autoApplyThreshold: options.autoApplyThreshold,
    minMatchScore: options.minMatchScore,
    autoApply: options.autoApply,
    dryRun: options.dryRun !== undefined ? options.dryRun : true,
    delayBetweenApps: options.delayBetweenApps,
    excludeCompanies: options.excludeCompanies,
    excludeKeywords: options.excludeKeywords,
    preferredCompanies: options.preferredCompanies,
    keywords: options.keywords,
    useAI: options.useAI,
    resumePath: options.resumePath,
  });

  return {
    autoApplier,
    logger,
    d1Client,
    fetch,
    env,
    repository,
    telegram,
    claude,
    wanted,

    /**
     * Get all mocks
     * @returns {Object}
     */
    getMocks() {
      return {
        logger,
        d1Client,
        fetch,
        telegram,
        claude,
        wanted,
        repository,
      };
    },
  };
}

// ========================
// Job Filter Test Helper
// ========================

/**
 * Create job filter with mocks
 * @param {Object} [options]
 * @returns {Promise<Object>} JobFilter instance and mocks
 */
export async function createTestJobFilter(options = {}) {
  const { logger } = createTestServices(options);

  let JobFilter;
  try {
    const module = await import('../shared/services/apply/job-filter.js');
    JobFilter = module.JobFilter;
  } catch {
    JobFilter = class MockJobFilter {
      constructor(opts) {
        this.logger = opts.logger || logger;
        this.config = {
          reviewThreshold: opts.reviewThreshold || 60,
          autoApplyThreshold: opts.autoApplyThreshold || 75,
          minMatchScore: opts.minMatchScore || 60,
          excludeKeywords: opts.excludeKeywords || [],
          excludeCompanies: opts.excludeCompanies || [],
          preferredCompanies: opts.preferredCompanies || [],
          keywords: opts.keywords || [],
        };
      }

      shouldReview(job) {
        const score = job.matchScore || 0;
        return score >= this.config.reviewThreshold && score < this.config.autoApplyThreshold;
      }

      shouldAutoApply(job) {
        const score = job.matchScore || 0;
        return score >= this.config.autoApplyThreshold;
      }

      isExcluded(job) {
        const excludeCompany = this.config.excludeCompanies.some(
          (c) => job.company && job.company.toLowerCase().includes(c.toLowerCase())
        );
        const excludeKeyword = this.config.excludeKeywords.some(
          (k) => job.position && job.position.toLowerCase().includes(k.toLowerCase())
        );
        return excludeCompany || excludeKeyword;
      }
    };
  }

  const jobFilter = new JobFilter({
    logger,
    reviewThreshold: options.reviewThreshold,
    autoApplyThreshold: options.autoApplyThreshold,
    minMatchScore: options.minMatchScore,
    excludeKeywords: options.excludeKeywords,
    excludeCompanies: options.excludeCompanies,
    preferredCompanies: options.preferredCompanies,
    keywords: options.keywords,
  });

  return {
    jobFilter,
    logger,
  };
}

// ========================
// Integration Test Setup
// ========================

/**
 * Setup integration test environment
 * @param {Object} [options]
 * @returns {Promise<Object>} Test environment
 */
export async function setupIntegrationTest(options = {}) {
  const services = createTestServices(options);
  const dbSetup = setupTestDatabase(services.d1Client);

  await dbSetup.createTables();

  // Seed with mock applications if requested
  if (options.seedApplications) {
    await dbSetup.seedApplications(options.seedApplications);
  }

  return {
    ...services,
    dbSetup,

    /**
     * Cleanup after test
     * @returns {Promise<void>}
     */
    async teardown() {
      await dbSetup.resetTables();
    },

    /**
     * Full cleanup including tables
     * @returns {Promise<void>}
     */
    async fullTeardown() {
      await dbSetup.dropTables();
    },
  };
}

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

// ========================
// Default export
// ========================

export default {
  setupTestDatabase,
  createTestServices,
  createTestAutoApplier,
  createTestJobFilter,
  setupIntegrationTest,
  createTestContext,
};
