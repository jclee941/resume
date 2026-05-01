import { sendTelegramNotification, escapeHtml } from '../services/notifications.js';

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
