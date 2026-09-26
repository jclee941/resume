import { NotificationService, escapeHtml } from '../../services/notifications.js';

/**
 * @typedef {import('./application-submission-gates.js').GateJob & {
 *   matchScore?: number | string;
 * }} ApprovedJob
 */

/**
 * @param {{ env: import('../../services/notifications.js').NotificationEnv }} ctx
 * @returns {NotificationService}
 */
export function createNotificationService(ctx) {
  return new NotificationService(ctx.env);
}

/**
 * @param {NotificationService} notificationService
 * @param {string} triggerType
 * @param {string[]} platforms
 * @returns {Promise<void>}
 */
export async function notifyNoJobs(notificationService, triggerType, platforms) {
  await notificationService.sendTelegramNotification({
    text:
      '🔍 <b>Application Workflow Complete</b>\n\n' +
      `<b>Trigger</b>: ${triggerType}\n` +
      `<b>Platforms</b>: ${platforms.join(', ')}\n` +
      '<b>Result</b>: No jobs found matching criteria',
  });
}

/**
 * @param {NotificationService} notificationService
 * @param {{ stats: { jobsFound: number; jobsApproved: number; jobsApplied: number; jobsFailed: number } }} workflow
 * @param {string} triggerType
 * @param {boolean} dryRun
 * @param {ApprovedJob[]} approvedJobs
 * @returns {Promise<void>}
 */
export async function notifyCompletion(
  notificationService,
  workflow,
  triggerType,
  dryRun,
  approvedJobs
) {
  const success = workflow.stats.jobsApplied > 0;
  const icon = success ? '✅' : workflow.stats.jobsFailed > 0 ? '⚠️' : 'ℹ️';
  const status = success ? 'Success' : workflow.stats.jobsFailed > 0 ? 'Partial' : 'No Action';

  await notificationService.sendTelegramNotification({
    text:
      `${icon} <b>Application Workflow Complete</b>\n\n` +
      `<b>Status</b>: ${status}\n` +
      `<b>Trigger</b>: ${triggerType}\n` +
      `<b>Mode</b>: ${dryRun ? 'Dry Run' : 'Live'}\n\n` +
      '<b>Stats</b>:\n' +
      `  Found: ${workflow.stats.jobsFound}\n` +
      `  Approved: ${workflow.stats.jobsApproved}\n` +
      `  Applied: ${workflow.stats.jobsApplied}\n` +
      `  Failed: ${workflow.stats.jobsFailed}\n\n` +
      `<b>Top Jobs</b>:\n${topApprovedJobs(approvedJobs)}`,
  });
}

/**
 * @param {ApprovedJob[]} approvedJobs
 * @returns {string}
 */
function topApprovedJobs(approvedJobs) {
  return (
    approvedJobs
      .slice(0, 5)
      .map(
        (job) => `  • ${escapeHtml(job.company)} - ${escapeHtml(job.position)} (${job.matchScore}%)`
      )
      .join('\n') || 'None'
  );
}
