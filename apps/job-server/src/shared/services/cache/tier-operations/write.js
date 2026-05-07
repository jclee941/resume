import { ensureD1Schema } from './d1-schema.js';

/**
 * Write to KV (hot tier).
 *
 * @param {KVNamespace} kv - KV namespace binding
 * @param {string} tieredKey - Full key with namespace prefix
 * @param {import('../index.js').CacheEnvelope} envelope - Cache envelope to store
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
 * @param {import('../index.js').CacheEnvelope} envelope - Cache envelope to store
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
 * @param {import('../index.js').CacheEnvelope} envelope - Cache envelope to store
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

export { writeHot, writeWarm, writeCold };
