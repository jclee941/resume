import { escapeHtml } from './formatters.js';
import { sendTelegramNotification } from './delivery.js';

async function updateWorkflowApprovalState(service, applicationId, stateMutator) {
  const workflowKey = `workflow:application:${applicationId}`;
  const workflowState = await service.env.SESSIONS.get(workflowKey);

  if (!workflowState) {
    return;
  }

  const state = JSON.parse(workflowState);
  stateMutator(state);

  await service.env.SESSIONS.put(workflowKey, JSON.stringify(state), {
    expirationTtl: 86400 * 7,
  });
}

export async function approveApplication(service, applicationId) {
  try {
    await service.env.DB.prepare(
      `
        UPDATE applications
        SET status = 'approved', approved_at = datetime('now')
        WHERE id = ?
      `
    )
      .bind(applicationId)
      .run();

    await updateWorkflowApprovalState(service, applicationId, (state) => {
      state.approved = true;
      state.approvedAt = new Date().toISOString();
    });

    return { success: true, message: `✅ Application ${applicationId} approved.` };
  } catch (error) {
    console.error('[NotificationService] Approve error:', error);
    return { success: false, message: `❌ Failed to approve: ${error.message}` };
  }
}

export async function rejectApplication(service, applicationId) {
  try {
    await service.env.DB.prepare(
      `
        UPDATE applications
        SET status = 'rejected', rejected_at = datetime('now')
        WHERE id = ?
      `
    )
      .bind(applicationId)
      .run();

    await updateWorkflowApprovalState(service, applicationId, (state) => {
      state.approved = false;
      state.rejectedAt = new Date().toISOString();
    });

    return { success: true, message: `❌ Application ${applicationId} rejected.` };
  } catch (error) {
    console.error('[NotificationService] Reject error:', error);
    return { success: false, message: `❌ Failed to reject: ${error.message}` };
  }
}

export async function viewApplicationDetails(service, applicationId) {
  try {
    const application = await service.env.DB.prepare(
      `
        SELECT * FROM applications WHERE id = ?
      `
    )
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
