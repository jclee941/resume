import { sendTelegramNotification, escapeHtml } from '../services/notifications.js';

const ERROR_PREVIEW_LENGTH = 200;

/**
 * @param {import('../services/notifications.js').NotificationEnv} env
 * @param {{
 *   resumeId: string;
 *   dryRun: boolean;
 *   results: Record<string, import('../services/resume-platform-sync/index.js').PlatformSyncOutcome>;
 * }} outcome
 * @returns {Promise<{ notified: boolean }>}
 */
export async function notifyResumeSyncOutcome(env, { resumeId, dryRun, results }) {
  const outcomes = Object.entries(results);
  const allSucceeded = outcomes.every(([, result]) => result.success);
  const lines = outcomes.map(([platform, result]) => {
    const detail = result.error
      ? ` ${escapeHtml(String(result.error).slice(0, ERROR_PREVIEW_LENGTH))}`
      : '';
    return `<b>${escapeHtml(platform)}</b>: ${result.success ? 'ok' : 'failed'}${detail}`;
  });
  const title = dryRun
    ? '👀 <b>Resume Sync Preview (Dry Run)</b>'
    : allSucceeded
      ? '✅ <b>Resume Sync Complete</b>'
      : '⚠️ <b>Resume Sync Completed With Issues</b>';

  await sendTelegramNotification(
    env,
    `${title}\n\n<b>Resume</b>: ${escapeHtml(resumeId)}\n<b>Platforms</b>:\n${lines.join('\n')}`
  );
  return { notified: true };
}
