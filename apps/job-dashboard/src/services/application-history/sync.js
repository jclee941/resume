/**
 * @fileoverview Orchestrates the application-history sync: fetches each requested platform in
 * parallel under a shared time budget, upserts what it found, and records one `sync_logs` row.
 * A platform that fails (no session, expired session, upstream error, timeout) reports its own
 * error and leaves `applications` untouched; the other platform still syncs.
 * @module services/application-history/sync
 */
import { fetchJobKoreaHistory } from './jobkorea-adapter.js';
import { HISTORY_PLATFORMS, HistorySyncError } from './history-types.js';
import { upsertApplicationHistory } from './history-repository.js';
import { fetchWantedHistory } from './wanted-adapter.js';

export { HISTORY_PLATFORMS };
export const HISTORY_SYNC_TYPE = 'application-history';
const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * @typedef {Parameters<typeof fetchWantedHistory>[0]
 *   & Parameters<typeof fetchJobKoreaHistory>[0]
 *   & { JOB_DB: import('./history-repository.js').HistoryDb }} HistoryEnv
 *
 * @typedef {Record<
 *   import('./history-types.js').HistoryPlatform,
 *   (env: HistoryEnv) => Promise<import('./history-types.js').HistoryRecord[]>
 * >} HistoryAdapters
 *
 * @typedef {({ ok: true } & import('./history-repository.js').UpsertCounts)
 *   | { ok: false; code: string; error: string }} PlatformResult
 *
 * @typedef {{
 *   ok: boolean;
 *   status: 'success' | 'partial' | 'failed';
 *   platforms: Record<string, PlatformResult>;
 * }} HistorySyncSummary
 */

/** @type {HistoryAdapters} */
const DEFAULT_ADAPTERS = {
  wanted: (env) => fetchWantedHistory(env),
  jobkorea: (env) => fetchJobKoreaHistory(env),
};

/**
 * @template T
 * @param {Promise<T>} work
 * @param {number} ms
 * @returns {Promise<T>}
 */
function withTimeout(work, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const expiry = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new HistorySyncError('TIMEOUT', `Timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([work, expiry]).finally(() => clearTimeout(timer));
}

/**
 * @param {HistoryEnv} env
 * @param {import('./history-types.js').HistoryPlatform} platform
 * @param {HistoryAdapters} adapters
 * @param {number} timeoutMs
 * @param {string} now
 * @returns {Promise<PlatformResult>}
 */
async function syncPlatform(env, platform, adapters, timeoutMs, now) {
  try {
    // Only the fetch is time-bounded: the write starts after it resolved in time, so a fetch
    // that finishes after TIMEOUT was reported is never written.
    const records = await withTimeout(adapters[platform](env), timeoutMs);
    const counts = await upsertApplicationHistory(env.JOB_DB, records, now);
    return { ok: true, ...counts };
  } catch (error) {
    const code = error instanceof HistorySyncError ? error.code : 'SYNC_FAILED';
    return { ok: false, code, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * @param {HistoryEnv} env
 * @param {HistorySyncSummary} summary
 * @param {string} startedAt
 * @param {string} completedAt
 * @returns {Promise<void>}
 */
async function recordRun(env, summary, startedAt, completedAt) {
  try {
    await env.JOB_DB.prepare(
      'INSERT INTO sync_logs (id, sync_type, status, started_at, completed_at, details) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        crypto.randomUUID(),
        HISTORY_SYNC_TYPE,
        summary.status,
        startedAt,
        completedAt,
        JSON.stringify(summary.platforms)
      )
      .all();
  } catch (error) {
    console.warn('[application-history] could not record sync run:', error);
  }
}

/**
 * @param {HistoryEnv} env
 * @param {{
 *   platforms?: import('./history-types.js').HistoryPlatform[];
 *   adapters?: HistoryAdapters;
 *   timeoutMs?: number;
 *   now?: () => string;
 * }} [options]
 * @returns {Promise<HistorySyncSummary>}
 */
export async function syncApplicationHistory(env, options = {}) {
  const {
    platforms = [...HISTORY_PLATFORMS],
    adapters = DEFAULT_ADAPTERS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    now = () => new Date().toISOString(),
  } = options;
  const startedAt = now();
  const results = await Promise.all(
    platforms.map((platform) => syncPlatform(env, platform, adapters, timeoutMs, startedAt))
  );
  const okCount = results.filter((result) => result.ok).length;
  /** @type {HistorySyncSummary} */
  const summary = {
    ok: okCount === results.length,
    status: okCount === results.length ? 'success' : okCount === 0 ? 'failed' : 'partial',
    platforms: Object.fromEntries(platforms.map((platform, index) => [platform, results[index]])),
  };
  await recordRun(env, summary, startedAt, now());
  return summary;
}
