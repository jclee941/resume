import { createTestServices } from './service-setup.js';
import { setupTestDatabase } from './database-setup.js';

// ========================
// Integration Test Setup
// ========================

/**
 * @typedef {Object} IntegrationTestOptions
 * @property {import('./database-setup.js').ApplicationRecord[]} [seedApplications]
 * @property {import('./database-setup.js').D1ClientLike} [d1Client]
 * @property {unknown} [logger]
 * @property {unknown} [fetch]
 * @property {unknown} [env]
 * @property {unknown} [repository]
 * @property {unknown} [telegram]
 * @property {unknown} [claude]
 * @property {unknown} [wanted]
 */

/**
 * Setup integration test environment
 * @param {IntegrationTestOptions} [options]
 * @returns {Promise<Record<string, unknown>>} Test environment
 */
export async function setupIntegrationTest(options = {}) {
  const services =
    /** @type {{ d1Client: import('./database-setup.js').D1ClientLike, [key: string]: unknown }} */ (
      createTestServices(options)
    );
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
