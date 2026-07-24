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
