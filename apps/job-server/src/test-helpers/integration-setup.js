import { createTestServices } from './service-setup.js';
import { setupTestDatabase } from './database-setup.js';

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
