/**
 * In-memory D1 mock utility for test helpers.
 * @file apps/job-server/src/test-helpers/database-mock.js
 */

// ========================
// D1 Client Mock
// ========================

/**
 * @typedef {Object} MockD1QueryResult
 * @property {Record<string, unknown>[]} results
 */

/**
 * @typedef {Object} MockD1Client
 * @property {Map<string, Array<Record<string, unknown>>>} tables
 * @property {Array<{ sql: string, params: unknown[] }>} queries
 * @property {(sql: string, params?: unknown[]) => Promise<MockD1QueryResult>} query
 * @property {(table: string) => Array<Record<string, unknown>>} getTable
 * @property {() => void} reset
 * @property {(table: string, data: Array<Record<string, unknown>>) => void} seed
 */

/**
 * Create an in-memory D1 mock client
 * @returns {MockD1Client} Mock D1 client
 */
export function createMockD1Client() {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const tables = new Map();
  tables.set('applications', []);
  tables.set('application_timeline', []);
  tables.set('approval_requests', []);

  /** @type {Array<{ sql: string, params: unknown[] }>} */
  const queries = [];

  return {
    tables,
    queries,

    /**
     * @param {string} sql
     * @param {unknown[]} [params]
     * @returns {Promise<MockD1QueryResult>}
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
        /** @type {Record<string, unknown>[]} */ (tables.get('applications')).push(row);
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
        /** @type {Record<string, unknown>[]} */ (tables.get('application_timeline')).push(row);
        return { results: [] };
      }

      if (normalized.startsWith('select * from applications')) {
        const rows = /** @type {Record<string, unknown>[]} */ (tables.get('applications'));
        return { results: rows };
      }

      if (normalized.startsWith('select * from application_timeline')) {
        const appIdMatch = sql.match(/application_id\s*=\s*@?(\?|\$[0-9]+)/i);
        if (appIdMatch) {
          const rows = /** @type {Record<string, unknown>[]} */ (
            tables.get('application_timeline')
          );
          return { results: rows };
        }
        return {
          results: /** @type {Record<string, unknown>[]} */ (tables.get('application_timeline')),
        };
      }

      return { results: [] };
    },

    /**
     * @param {string} table
     * @returns {Array<Record<string, unknown>>}
     */
    getTable(table) {
      return tables.get(table) || [];
    },

    /**
     * Reset all tables
     */
    reset() {
      /** @type {Record<string, unknown>[]} */ (tables.get('applications')).length = 0;
      /** @type {Record<string, unknown>[]} */ (tables.get('application_timeline')).length = 0;
      /** @type {Record<string, unknown>[]} */ (tables.get('approval_requests')).length = 0;
      queries.length = 0;
    },

    /**
     * Seed table with data
     * @param {string} table
     * @param {Array<Record<string, unknown>>} data
     */
    seed(table, data) {
      tables.set(table, [...data]);
    },
  };
}
