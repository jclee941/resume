/**
 * @param {import('./resume-sync-data.js').ResumeSyncEnv} env
 * @param {{
 *   syncId: string;
 *   resumeId: string;
 *   platforms: string[];
 *   results: Record<string, unknown>;
 *   success: boolean;
 *   dryRun: boolean;
 * }} options
 * @returns {Promise<void>}
 */
export async function recordSyncHistory(
  env,
  { syncId, resumeId, platforms, results, success, dryRun }
) {
  await env.JOB_DB.prepare(
    `INSERT INTO resume_sync_history (id, resume_id, platforms, changes, status, dry_run, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(
      syncId,
      resumeId,
      JSON.stringify(platforms),
      JSON.stringify(results),
      success ? 'completed' : 'partial_failed',
      dryRun ? 1 : 0
    )
    .run();
}
