/**
 * Tier-specific storage operations for the tiered cache.
 *
 * These functions handle individual tier I/O operations and receive
 * their dependencies as parameters instead of using `this` binding.
 */

const WARM_TIER = 'warm';
const COLD_TIER = 'cold';

// Track initialized D1 tables at module level
const initializedTables = new Set();

/**
 * Read from KV (hot tier).
 *
 * @param {KVNamespace} kv - KV namespace binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {number} now - Current timestamp
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<import('./index.js').CacheEnvelope|null>}
 */
async function readHot(kv, tieredKey, now, logger) {
  if (!kv) {
    return null;
  }

  try {
    const raw = await kv.get(tieredKey, 'json');
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const envelope = /** @type {import('./index.js').CacheEnvelope} */ (raw);
    if (envelope.expiresAt <= now) {
      return null;
    }

    return envelope;
  } catch (error) {
    logger.warn?.(`[CacheManager] hot read failed for ${tieredKey}: ${error.message}`);
    return null;
  }
}

/**
 * Read from D1 (warm tier).
 *
 * @param {D1Database} d1 - D1 database binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {number} now - Current timestamp
 * @param {string} tableName - D1 table name
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<import('./index.js').CacheEnvelope|null>}
 */
async function readWarm(d1, tieredKey, now, tableName, logger) {
  if (!d1) {
    return null;
  }

  const schemaReady = await ensureD1Schema(d1, tableName);
  if (!schemaReady) {
    return null;
  }

  try {
    const row = await d1
      .prepare(
        `SELECT value, expires_at, created_at, updated_at, last_accessed_at
         FROM ${tableName}
         WHERE cache_key = ?1`
      )
      .bind(tieredKey)
      .first();

    if (!row) {
      return null;
    }

    const expiresAt = Number(row.expires_at);
    if (expiresAt <= now) {
      return null;
    }

    const envelope = {
      value: JSON.parse(String(row.value)),
      tier: WARM_TIER,
      expiresAt,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      lastAccessedAt: Number(row.last_accessed_at),
    };

    await d1
      .prepare(`UPDATE ${tableName} SET last_accessed_at = ?1 WHERE cache_key = ?2`)
      .bind(now, tieredKey)
      .run();

    return envelope;
  } catch (error) {
    logger.warn?.(`[CacheManager] warm read failed for ${tieredKey}: ${error.message}`);
    return null;
  }
}

/**
 * Read from R2 (cold tier).
 *
 * @param {R2Bucket} r2 - R2 bucket binding
 * @param {string} objectKey - Full R2 object key
 * @param {number} now - Current timestamp
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<import('./index.js').CacheEnvelope|null>}
 */
async function readCold(r2, objectKey, now, logger) {
  if (!r2) {
    return null;
  }

  try {
    const object = await r2.get(objectKey);
    if (!object) {
      return null;
    }

    const payload = await object.json();
    const envelope = /** @type {import('./index.js').CacheEnvelope} */ (payload);

    if (envelope.expiresAt <= now) {
      return null;
    }

    return {
      ...envelope,
      tier: COLD_TIER,
    };
  } catch (error) {
    logger.warn?.(`[CacheManager] cold read failed for ${objectKey}: ${error.message}`);
    return null;
  }
}

/**
 * Write to KV (hot tier).
 *
 * @param {KVNamespace} kv - KV namespace binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {import('./index.js').CacheEnvelope} envelope - Cache envelope to store
 * @param {number} ttlSeconds - TTL in seconds
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<void>}
 */
async function writeHot(kv, tieredKey, envelope, ttlSeconds, logger) {
  if (!kv) {
    return;
  }

  try {
    await kv.put(tieredKey, JSON.stringify(envelope), {
      expirationTtl: ttlSeconds,
    });
  } catch (error) {
    logger.warn?.(`[CacheManager] hot write failed for ${tieredKey}: ${error.message}`);
  }
}

/**
 * Write to D1 (warm tier).
 *
 * @param {D1Database} d1 - D1 database binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {import('./index.js').CacheEnvelope} envelope - Cache envelope to store
 * @param {string} tableName - D1 table name
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<void>}
 */
async function writeWarm(d1, tieredKey, envelope, tableName, logger) {
  if (!d1) {
    return;
  }

  const schemaReady = await ensureD1Schema(d1, tableName);
  if (!schemaReady) {
    return;
  }

  try {
    await d1
      .prepare(
        `INSERT INTO ${tableName}
           (cache_key, value, expires_at, created_at, updated_at, last_accessed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(cache_key) DO UPDATE SET
           value = excluded.value,
           expires_at = excluded.expires_at,
           updated_at = excluded.updated_at,
           last_accessed_at = excluded.last_accessed_at`
      )
      .bind(
        tieredKey,
        JSON.stringify(envelope.value),
        envelope.expiresAt,
        envelope.createdAt,
        envelope.updatedAt,
        envelope.lastAccessedAt
      )
      .run();
  } catch (error) {
    logger.warn?.(`[CacheManager] warm write failed for ${tieredKey}: ${error.message}`);
  }
}

/**
 * Write to R2 (cold tier).
 *
 * @param {R2Bucket} r2 - R2 bucket binding
 * @param {string} objectKey - Full R2 object key
 * @param {import('./index.js').CacheEnvelope} envelope - Cache envelope to store
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<void>}
 */
async function writeCold(r2, objectKey, envelope, logger) {
  if (!r2) {
    return;
  }

  try {
    await r2.put(objectKey, JSON.stringify(envelope), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        expiresAt: String(envelope.expiresAt),
      },
    });
  } catch (error) {
    logger.warn?.(`[CacheManager] cold write failed for ${objectKey}: ${error.message}`);
  }
}

/**
 * Delete from KV (hot tier).
 *
 * @param {KVNamespace} kv - KV namespace binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<void>}
 */
async function deleteHot(kv, tieredKey, logger) {
  if (!kv) {
    return;
  }

  try {
    await kv.delete(tieredKey);
  } catch (error) {
    logger.warn?.(`[CacheManager] hot delete failed for ${tieredKey}: ${error.message}`);
  }
}

/**
 * Delete from D1 (warm tier).
 *
 * @param {D1Database} d1 - D1 database binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {string} tableName - D1 table name
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<void>}
 */
async function deleteWarm(d1, tieredKey, tableName, logger) {
  if (!d1) {
    return;
  }

  const schemaReady = await ensureD1Schema(d1, tableName);
  if (!schemaReady) {
    return;
  }

  try {
    await d1.prepare(`DELETE FROM ${tableName} WHERE cache_key = ?1`).bind(tieredKey).run();
  } catch (error) {
    logger.warn?.(`[CacheManager] warm delete failed for ${tieredKey}: ${error.message}`);
  }
}

/**
 * Delete from R2 (cold tier).
 *
 * @param {R2Bucket} r2 - R2 bucket binding
 * @param {string} objectKey - Full R2 object key
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<void>}
 */
async function deleteCold(r2, objectKey, logger) {
  if (!r2) {
    return;
  }

  try {
    await r2.delete(objectKey);
  } catch (error) {
    logger.warn?.(`[CacheManager] cold delete failed for ${objectKey}: ${error.message}`);
  }
}

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

export {
  readHot,
  readWarm,
  readCold,
  writeHot,
  writeWarm,
  writeCold,
  deleteHot,
  deleteWarm,
  deleteCold,
  ensureD1Schema,
};
