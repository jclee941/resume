import { escapeHtml } from './formatters.js';
import { sendTelegramNotification } from './delivery.js';

// Approval buttons carry approval_requests ids (ApplicationWorkflow and the
// notification queue); older messages may still carry applications ids.
async function recordDecision(service, id, decision) {
  const db = service.env.JOB_DB;
  const approval = await db
    .prepare(
      `
        UPDATE approval_requests
        SET status = ?, reviewed_by = 'telegram', reviewed_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `
    )
    .bind(decision, id)
    .run();
  if (approval.meta?.changes) return true;

  const decidedAtColumn = decision === 'approved' ? 'approved_at' : 'rejected_at';
  const application = await db
    .prepare(
      `UPDATE applications SET status = ?, ${decidedAtColumn} = datetime('now') WHERE id = ?`
    )
    .bind(decision, id)
    .run();
  return Boolean(application.meta?.changes);
}

export async function approveApplication(service, applicationId) {
  try {
    if (!(await recordDecision(service, applicationId, 'approved'))) {
      return { success: false, message: `❌ Application ${applicationId} not found.` };
    }
    return { success: true, message: `✅ Application ${applicationId} approved.` };
  } catch (error) {
    console.error('[NotificationService] Approve error:', error);
    return { success: false, message: `❌ Failed to approve: ${error.message}` };
  }
}

export async function rejectApplication(service, applicationId) {
  try {
    if (!(await recordDecision(service, applicationId, 'rejected'))) {
      return { success: false, message: `❌ Application ${applicationId} not found.` };
    }
    return { success: true, message: `❌ Application ${applicationId} rejected.` };
  } catch (error) {
    console.error('[NotificationService] Reject error:', error);
    return { success: false, message: `❌ Failed to reject: ${error.message}` };
  }
}

export async function viewApplicationDetails(service, applicationId) {
  try {
    const db = service.env.JOB_DB;
    const approval = await db
      .prepare(
        'SELECT id, job_title, company, platform, match_score, status FROM approval_requests WHERE id = ?'
      )
      .bind(applicationId)
      .first();
    if (approval) {
      await sendTelegramNotification(service, { text: formatApprovalDetails(approval) });
      return { success: true, message: 'Details sent.' };
    }

    const application = await db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(applicationId)
      .first();

    if (!application) {
      return { success: false, message: `Application ${applicationId} not found.` };
    }

    const text =
      '📋 <b>Application Details</b>\n\n' +
      `<b>ID:</b> <code>${application.id}</code>\n` +
      `<b>Company:</b> ${escapeHtml(application.company)}\n` +
      `<b>Position:</b> ${escapeHtml(application.position)}\n` +
      `<b>Platform:</b> ${escapeHtml(application.source)}\n` +
      `<b>Status:</b> ${application.status}\n` +
      `<b>Applied:</b> ${application.applied_at || 'N/A'}`;

    await sendTelegramNotification(service, { text });
    return { success: true, message: 'Details sent.' };
  } catch (error) {
    console.error('[NotificationService] View error:', error);
    return { success: false, message: `Failed to fetch details: ${error.message}` };
  }
}

function formatApprovalDetails(approval) {
  return (
    '📋 <b>Approval Request</b>\n\n' +
    `<b>ID:</b> <code>${escapeHtml(approval.id)}</code>\n` +
    `<b>Company:</b> ${escapeHtml(approval.company)}\n` +
    `<b>Position:</b> ${escapeHtml(approval.job_title)}\n` +
    `<b>Platform:</b> ${escapeHtml(approval.platform)}\n` +
    `<b>Match Score:</b> ${approval.match_score}/100\n` +
    `<b>Status:</b> ${escapeHtml(approval.status)}`
  );
}
