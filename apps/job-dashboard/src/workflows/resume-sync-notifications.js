import { sendTelegramNotification, escapeHtml } from '../services/notifications.js';

/**
 * @typedef {{
 *   additions: number;
 *   updates: number;
 *   deletions: number;
 * }} SyncPlatformChanges
 *
 * @typedef {{
 *   resumeId: string;
 *   changes: Record<string, SyncPlatformChanges>;
 * }} ResumeSync
 */

/**
 * @param {Record<string, unknown>} env
 * @param {ResumeSync} sync
 * @param {unknown} [_diffs]
 * @returns {Promise<void>}
 */
export async function notifyPreview(env, sync, _diffs) {
  const summary = Object.entries(sync.changes)
    .map(
      ([platform, changes]) =>
        `<b>${escapeHtml(platform)}</b>: +${changes.additions} ~${changes.updates} -${changes.deletions}`
    )
    .join('\n');

  await sendTelegramNotification(
    env,
    '👀 <b>Resume Sync Preview (Dry Run)</b>\n\n' +
      `<b>Resume</b>: ${escapeHtml(sync.resumeId)}\n` +
      `<b>Platforms</b>:\n${summary}`
  );
}

/**
 * @param {Record<string, unknown>} env
 * @param {{
 *   resumeId: string;
 *   platforms: string[];
 *   changes: Record<string, SyncPlatformChanges>;
 *   backupId: string;
 * }} options
 * @returns {Promise<{ notified: boolean }>}
 */
export async function notifySyncCompletion(env, { resumeId, platforms, changes, backupId }) {
  const summary = platforms
    .map((p) => {
      const platformChanges = changes[p];
      return `<b>${escapeHtml(p)}</b>: +${platformChanges.additions} ~${platformChanges.updates} -${platformChanges.deletions}`;
    })
    .join('\n');

  await sendTelegramNotification(
    env,
    '✅ <b>Resume Sync Complete</b>\n\n' +
      `<b>Resume</b>: ${escapeHtml(resumeId)}\n` +
      `<b>Platforms</b>:\n${summary}\n` +
      `<b>Backup ID</b>: ${escapeHtml(backupId)}`
  );
  return { notified: true };
}
