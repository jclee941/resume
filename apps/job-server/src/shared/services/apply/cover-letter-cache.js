import { toSafeString } from './cover-letter-normalization.js';

const DB_SELECT_COVER_LETTER_SQL = `
  SELECT cover_letter
  FROM applications
  WHERE job_id = ?1
    AND cover_letter IS NOT NULL
    AND TRIM(cover_letter) <> ''
  ORDER BY updated_at DESC
  LIMIT 1
`;
const CLIENT_SELECT_COVER_LETTER_SQL = `
  SELECT cover_letter
  FROM applications
  WHERE job_id = ?
    AND cover_letter IS NOT NULL
    AND TRIM(cover_letter) <> ''
  ORDER BY updated_at DESC
  LIMIT 1
`;
const DB_UPDATE_COVER_LETTER_SQL = `
  UPDATE applications
  SET cover_letter = ?1,
      updated_at = datetime('now')
  WHERE job_id = ?2
`;
const CLIENT_UPDATE_COVER_LETTER_SQL = `
  UPDATE applications
  SET cover_letter = ?,
      updated_at = datetime('now')
  WHERE job_id = ?
`;

/**
 * @typedef {{
 *   prepare(sql: string): {
 *     bind(...params: unknown[]): {
 *       first(): Promise<{ cover_letter?: string | null } | null | undefined>;
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} D1Database
 *
 * @typedef {{
 *   query(sql: string, params?: unknown[]): Promise<Array<{ cover_letter?: string | null }>>;
 * }} D1Client
 *
 * @typedef {{
 *   warn(message: string, ...args: unknown[]): void;
 * }} Logger
 *
 * @typedef {{
 *   has(key: string): boolean;
 *   get(key: string): string | null | undefined;
 *   set(key: string, value: string): unknown;
 * }} CacheStore
 *
 * @typedef {{
 *   d1Client?: D1Client | null;
 *   db?: D1Database | null;
 *   logger?: Logger;
 *   cacheStore?: CacheStore;
 * }} CoverLetterCacheDependencies
 */

export class CoverLetterCache {
  /** @type {D1Client | null} */
  #d1Client;

  /** @type {D1Database | null} */
  #db;

  /** @type {Logger} */
  #logger;

  /** @type {CacheStore} */
  #store;

  /**
   * @param {CoverLetterCacheDependencies} [dependencies]
   */
  constructor(dependencies = {}) {
    this.#d1Client = dependencies.d1Client ?? null;
    this.#db = dependencies.db ?? null;
    this.#logger = dependencies.logger ?? console;
    this.#store = dependencies.cacheStore ?? new Map();
  }

  /**
   * @param {string | number} jobId
   * @returns {Promise<string | null>}
   */
  async get(jobId) {
    const key = String(jobId);

    if (this.#store.has(key)) {
      const cached = this.#store.get(key);
      if (toSafeString(cached).trim()) {
        return /** @type {string} */ (cached);
      }
    }

    const dbCached = await this.#getFromApplicationsTable(key);
    if (dbCached) {
      this.#store.set(key, dbCached);
      return dbCached;
    }

    return null;
  }

  /**
   * @param {string | number} jobId
   * @param {unknown} coverLetter
   * @returns {Promise<{ cached: boolean; reason?: string; persisted?: boolean }>}
   */
  async set(jobId, coverLetter) {
    const key = String(jobId);
    const value = toSafeString(coverLetter).trim();

    if (!value) {
      return { cached: false, reason: 'empty_cover_letter' };
    }

    this.#store.set(key, value);
    const persisted = await this.#persistToApplicationsTable(key, value);

    return {
      cached: true,
      persisted,
    };
  }

  /**
   * @param {string} jobId
   * @returns {Promise<string | null>}
   */
  async #getFromApplicationsTable(jobId) {
    try {
      if (this.#db?.prepare) {
        const row = await this.#db.prepare(DB_SELECT_COVER_LETTER_SQL).bind(jobId).first();
        return row?.cover_letter ? String(row.cover_letter) : null;
      }

      if (typeof this.#d1Client?.query === 'function') {
        const rows = await this.#d1Client.query(CLIENT_SELECT_COVER_LETTER_SQL, [jobId]);
        return rows?.[0]?.cover_letter ? String(rows[0].cover_letter) : null;
      }
    } catch (error) {
      this.#logger.warn(
        '[CoverLetterService] Failed to read cover letter cache:',
        /** @type {{ message?: string }} */ (error)?.message
      );
    }

    return null;
  }

  /**
   * @param {string} jobId
   * @param {string} coverLetter
   * @returns {Promise<boolean>}
   */
  async #persistToApplicationsTable(jobId, coverLetter) {
    try {
      if (this.#db?.prepare) {
        await this.#db.prepare(DB_UPDATE_COVER_LETTER_SQL).bind(coverLetter, jobId).run();
        return true;
      }

      if (typeof this.#d1Client?.query === 'function') {
        await this.#d1Client.query(CLIENT_UPDATE_COVER_LETTER_SQL, [coverLetter, jobId]);
        return true;
      }
    } catch (error) {
      this.#logger.warn(
        '[CoverLetterService] Failed to persist cover letter cache:',
        /** @type {{ message?: string }} */ (error)?.message
      );
    }

    return false;
  }
}
