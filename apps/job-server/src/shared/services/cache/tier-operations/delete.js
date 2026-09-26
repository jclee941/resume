import { ensureD1Schema } from './d1-schema.js';

/**
 * @typedef {{
 *   delete(key: string): Promise<unknown>;
 * }} KVNamespace
 *
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       run(): Promise<unknown>;
 *     };
 *     run(): Promise<unknown>;
 *   };
 * }} D1Database
 *
 * @typedef {{
 *   delete(key: string): Promise<unknown>;
 * }} R2Bucket
 */

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
    logger.warn?.(
      `[CacheManager] hot delete failed for ${tieredKey}: ${error instanceof Error ? error.message : String(error)}`
    );
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
    logger.warn?.(
      `[CacheManager] warm delete failed for ${tieredKey}: ${error instanceof Error ? error.message : String(error)}`
    );
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
    logger.warn?.(
      `[CacheManager] cold delete failed for ${objectKey}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export { deleteHot, deleteWarm, deleteCold };
