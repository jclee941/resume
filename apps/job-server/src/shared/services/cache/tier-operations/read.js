import { COLD_TIER, WARM_TIER } from './constants.js';
import { ensureD1Schema } from './d1-schema.js';

/**
 * Read from KV (hot tier).
 *
 * @param {KVNamespace} kv - KV namespace binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {number} now - Current timestamp
 * @param {Pick<Console, 'warn'|'error'|'info'>} logger - Logger instance
 * @returns {Promise<import('../index.js').CacheEnvelope|null>}
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

    const envelope = /** @type {import('../index.js').CacheEnvelope} */ (raw);
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
 * @returns {Promise<import('../index.js').CacheEnvelope|null>}
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
 * @returns {Promise<import('../index.js').CacheEnvelope|null>}
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
    const envelope = /** @type {import('../index.js').CacheEnvelope} */ (payload);

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

export { readHot, readWarm, readCold };
