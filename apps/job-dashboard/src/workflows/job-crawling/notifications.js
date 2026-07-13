import { escapeHtml, sendTelegramNotification } from '../../services/notifications.js';

/**
 * Send the crawl summary notification.
 *
 * @param {Object} env
 * @param {string[]} platforms
 * @param {{totalJobs: number}} results
 * @param {Object[]} matchedJobs
 * @returns {Promise<{notified: boolean, reason?: string}>}
 */
export async function notifyJobCrawlingResults(env, platforms, results, matchedJobs) {
  const topJobs =
    matchedJobs
      .slice(0, 5)
      .map((j) => `  • ${escapeHtml(j.company)} - ${escapeHtml(j.position)} (${j.matchScore}%)`)
      .join('\n') || 'None';

  const delivery = await sendTelegramNotification(
    env,
    '🔍 <b>Job Search Results</b>\n\n' +
      `<b>Platforms</b>: ${escapeHtml(platforms.join(', '))}\n` +
      `<b>Found</b>: ${results.totalJobs} jobs\n` +
      `<b>Matched</b>: ${matchedJobs.length} jobs\n\n` +
      `<b>Top Matches</b>:\n${topJobs}`
  );
  return {
    notified: delivery.sent,
    ...(delivery.reason ? { reason: delivery.reason } : {}),
  };
}

/**
 * @param {Object} env
 * @param {string} message
 * @returns {Promise<void>}
 */
export async function sendNotification(env, message) {
  await sendTelegramNotification(env, message);
}
