import { NotificationService, escapeHtml } from '../../services/notifications.js';

export function createNotificationService(ctx) {
  return new NotificationService(ctx.env);
}

export async function notifyNoJobs(notificationService, triggerType, platforms) {
  await notificationService.sendTelegramNotification({
    text:
      '🔍 <b>Application Workflow Complete</b>\n\n' +
      `<b>Trigger</b>: ${triggerType}\n` +
      `<b>Platforms</b>: ${platforms.join(', ')}\n` +
      '<b>Result</b>: No jobs found matching criteria',
  });
}

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
