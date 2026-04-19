import { answerCallbackQuery } from './delivery.js';
import { saveNotificationHistory } from './history.js';

export async function handleCallbackQuery(adapter, query, handlers = {}) {
  try {
    const callbackData = query?.data;
    const callbackId = query?.id;

    if (!callbackData || typeof callbackData !== 'string') {
      return { handled: false, reason: 'invalid_callback_data' };
    }

    const [action, applicationId] = callbackData.split(':');
    if (!action || !applicationId) {
      await answerCallbackQuery(adapter, callbackId, 'Invalid callback payload');
      return { handled: false, reason: 'invalid_callback_format' };
    }

    const mergedHandlers = {
      ...adapter.handlers,
      ...handlers,
    };

    let result;
    if (action === 'approve') {
      if (typeof mergedHandlers.onApprove === 'function') {
        result = await mergedHandlers.onApprove(applicationId, query);
      } else {
        result = await updateApprovalStatus(adapter, applicationId, 'approved');
      }
    } else if (action === 'reject') {
      if (typeof mergedHandlers.onReject === 'function') {
        result = await mergedHandlers.onReject(applicationId, query);
      } else {
        result = await updateApprovalStatus(adapter, applicationId, 'rejected');
      }
    } else if (action === 'view') {
      if (typeof mergedHandlers.onView === 'function') {
        result = await mergedHandlers.onView(applicationId, query);
      } else {
        result = {
          success: true,
          message: `Application ID: ${applicationId}`,
        };
      }
    } else {
      await answerCallbackQuery(adapter, callbackId, `Unknown action: ${action}`);
      return { handled: false, reason: 'unknown_action', action };
    }

    const callbackMessage = result?.message || `${action} processed`;
    await answerCallbackQuery(adapter, callbackId, callbackMessage);

    await saveNotificationHistory(adapter, {
      id: crypto.randomUUID(),
      eventType: 'approval_callback',
      data: {
        action,
        applicationId,
        callbackId,
      },
      channels: ['telegram'],
      timestamp: new Date().toISOString(),
      status: result?.success === false ? 'failed' : 'success',
      results: result,
    });

    return {
      handled: true,
      action,
      applicationId,
      result,
    };
  } catch (error) {
    adapter.logger.error(
      '[TelegramNotificationAdapter] handleCallbackQuery error:',
      error?.message
    );
    return {
      handled: false,
      reason: 'callback_handler_error',
      error: error?.message,
    };
  }
}

export async function updateApprovalStatus(adapter, applicationId, status) {
  const normalized = status === 'approved' ? 'approved' : 'rejected';

  try {
    if (adapter.db?.prepare) {
      const timestampField = normalized === 'approved' ? 'approved_at' : 'rejected_at';

      await adapter.db
        .prepare(
          `
            UPDATE applications
            SET status = ?, ${timestampField} = datetime('now')
            WHERE id = ?
          `
        )
        .bind(normalized, applicationId)
        .run();

      return {
        success: true,
        message:
          normalized === 'approved'
            ? `✅ Application ${applicationId} approved.`
            : `❌ Application ${applicationId} rejected.`,
      };
    }

    const handlerName = `on${normalized === 'approved' ? 'Approve' : 'Reject'}`;
    if (typeof adapter.handlers?.[handlerName] === 'function') {
      return await adapter.handlers[handlerName](applicationId);
    }

    return {
      success: false,
      message: `No approval persistence backend configured for ${applicationId}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update application ${applicationId}: ${error?.message}`,
    };
  }
}
