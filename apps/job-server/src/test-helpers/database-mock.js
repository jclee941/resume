/**
 * In-memory D1 mock utility for test helpers.
 * @file apps/job-server/src/test-helpers/database-mock.js
 */

// ========================
// D1 Client Mock
// ========================

/**
 * Create an in-memory D1 mock client
 * @returns {Object} Mock D1 client
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
