import { exportFromPlatform } from './resume-sync-data.js';
import { calculateDiff } from './resume-sync-diff.js';

export async function createResumeBackup(env, platformStates) {
  const backupId = `backup-${Date.now()}`;
  await env.SESSIONS.put(
    `resume:backup:${backupId}`,
    JSON.stringify({ platforms: platformStates, createdAt: new Date().toISOString() }),
    { expirationTtl: 86400 * 30 } // 30 days
  );
  return { backupId };
}

export async function verifyPlatformSync(
  env,
  { platforms, syncResults, masterData, platformResumeId, sections }
) {
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
