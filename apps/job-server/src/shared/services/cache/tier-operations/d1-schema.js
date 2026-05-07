// Track initialized D1 tables at module level.
const initializedTables = new Set();

/**
 * Ensure D1 schema exists for the cache table.
 * Uses module-level tracking to avoid redundant schema checks.
 *
 * @param {D1Database} d1 - D1 database binding
 * @param {string} tableName - D1 table name
 * @returns {Promise<boolean>} - Whether schema is ready
 */
async function ensureD1Schema(d1, tableName) {
  if (!d1) {
    return false;
  }

  if (initializedTables.has(tableName)) {
    return true;
  }

  try {
    await d1
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${tableName} (
          cache_key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_accessed_at INTEGER NOT NULL
        )`
      )
      .run();

    await d1
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_${tableName}_expires_at
         ON ${tableName}(expires_at)`
      )
      .run();

    initializedTables.add(tableName);
    return true;
  } catch (_error) {
    return false;
  }
}

export { ensureD1Schema };
