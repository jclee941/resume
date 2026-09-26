import { exportFromPlatform } from './resume-sync-data.js';
import { calculateDiff } from './resume-sync-diff.js';

/**
 * @typedef {{
 *   put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
 * }} KvNamespaceLike
 */

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} D1DatabaseLike
 */

/**
 * Own bindings come first so `JOB_DB.prepare(...).bind(...).run()` resolves
 * against this module's statement shape; the export helpers need the rest.
 * @typedef {{
 *   SESSIONS: KvNamespaceLike;
 *   JOB_DB: D1DatabaseLike;
 * } & import('./resume-sync-data.js').ResumeSyncEnv} ResumeSyncEnv
 */

/**
 * @typedef {{
 *   status?: string;
 *   [key: string]: unknown;
 * }} PlatformSyncResult
 */

/**
 * @typedef {{
 *   verified: boolean;
 *   reason?: string;
 *   remainingDiff?: import('./resume-sync-diff.js').ResumeDiff;
 * }} PlatformVerification
 */

/**
 * @param {ResumeSyncEnv} env
 * @param {Record<string, unknown>} platformStates
 * @returns {Promise<{ backupId: string }>}
 */
export async function createResumeBackup(env, platformStates) {
  const backupId = `backup-${Date.now()}`;
  await env.SESSIONS.put(
    `resume:backup:${backupId}`,
    JSON.stringify({ platforms: platformStates, createdAt: new Date().toISOString() }),
    { expirationTtl: 86400 * 30 } // 30 days
  );
  return { backupId };
}

/**
 * @param {ResumeSyncEnv} env
 * @param {{
 *   platforms: string[];
 *   syncResults: Record<string, PlatformSyncResult>;
 *   masterData: Record<string, import('./resume-sync-diff.js').ResumeItem[]>;
 *   platformResumeId?: string | null;
 *   sections?: string[];
 * }} options
 * @returns {Promise<Record<string, PlatformVerification>>}
 */
export async function verifyPlatformSync(
  env,
  { platforms, syncResults, masterData, platformResumeId, sections }
) {
  /** @type {Record<string, PlatformVerification>} */
  const results = {};
  for (const platform of platforms) {
    if (syncResults[platform].status === 'no-changes') {
      results[platform] = { verified: true, reason: 'no-changes' };
      continue;
    }

    const currentState = await exportFromPlatform(env, platform, platformResumeId);
    const verifyDiff = calculateDiff(masterData, currentState, sections);

    results[platform] = {
      verified:
        verifyDiff.additions.length === 0 &&
        verifyDiff.updates.length === 0 &&
        verifyDiff.deletions.length === 0,
      remainingDiff: verifyDiff,
    };
  }
  return results;
}

/**
 * @param {ResumeSyncEnv} env
 * @param {{
 *   syncId: string;
 *   resumeId: string;
 *   platforms: string[];
 *   changes: unknown;
 *   backupId: string;
 * }} options
 * @returns {Promise<void>}
 */
export async function recordSyncHistory(env, { syncId, resumeId, platforms, changes, backupId }) {
  await env.JOB_DB.prepare(
    `
          INSERT INTO resume_sync_history (
            id, resume_id, platforms, changes, status, backup_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `
  )
    .bind(
      syncId,
      resumeId,
      JSON.stringify(platforms),
      JSON.stringify(changes),
      'completed',
      backupId
    )
    .run();
}
