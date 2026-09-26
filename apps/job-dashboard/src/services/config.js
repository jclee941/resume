import { jsonResponse } from '../middleware/cors.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     all(): Promise<{ results: { key: string; value: string }[] }>;
 *     bind(...values: unknown[]): {
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} ConfigDatabase
 */

/**
 * @param {ConfigDatabase} db
 * @returns {Promise<Response>}
 */
export async function getConfig(db) {
  const result = await db.prepare('SELECT key, value FROM config').all();
  /** @type {Record<string, unknown>} */
  const config = {};
  for (const row of result.results) {
    try {
      config[row.key] = JSON.parse(row.value);
    } catch {
      config[row.key] = row.value;
    }
  }
  return jsonResponse(config);
}

/**
 * @param {Request} request
 * @param {ConfigDatabase} db
 * @returns {Promise<Response>}
 */
export async function saveConfig(request, db) {
  const body = /** @type {Record<string, unknown>} */ (await request.json());
  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(body)) {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    await db
      .prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)')
      .bind(key, valueStr, now)
      .run();
  }

  return jsonResponse({ success: true });
}
