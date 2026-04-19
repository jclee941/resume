import {
  approveApplication,
  rejectApplication,
  viewApplicationDetails,
} from './application-actions.js';
import { answerCallbackQuery, sendTelegramNotification } from './delivery.js';

export async function handleTelegramCommand(service, command, args, message) {
  const chatId = message.chat?.id;

  switch (command.toLowerCase()) {
    case '/status':
      return handleStatusCommand(service, chatId);
    case '/approve':
      return handleApproveCommand(service, chatId, args);
    case '/reject':
      return handleRejectCommand(service, chatId, args);
    case '/pause':
      return handlePauseCommand(service, chatId);
    case '/resume':
      return handleResumeCommand(service, chatId);
    case '/help':
      return handleHelpCommand(service, chatId);
    default:
      return sendTelegramNotification(service, {
        text: `Unknown command: ${command}\nUse /help for available commands.`,
      });
  }
}

export async function handleTelegramCallback(service, query) {
  const { data } = query;
  const [action, applicationId] = data.split(':');

  if (!applicationId) {
    return { handled: false, reason: 'invalid_callback_data' };
  }

  let result;
  switch (action) {
    case 'approve':
      result = await approveApplication(service, applicationId);
      break;
    case 'reject':
      result = await rejectApplication(service, applicationId);
      break;
    case 'view':
      result = await viewApplicationDetails(service, applicationId);
      break;
    default:
      return { handled: false, reason: 'unknown_action' };
  }

  await answerCallbackQuery(service, query.id, result.message);

  return { handled: true, action, applicationId, result };
}

export async function handleStatusCommand(service, _chatId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const stats = await service.env.DB.prepare(
      `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
          SUM(CASE WHEN status = 'awaiting_approval' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM applications
        WHERE date(applied_at) = date(?)
      `
    )
      .bind(today)
      .first();

    const text =
      `📊 <b>Today's Applications (${today})</b>\n\n` +
      `<b>Total:</b> ${stats?.total || 0}\n` +
      `<b>Applied:</b> ${stats?.applied || 0}\n` +
      `<b>Pending Approval:</b> ${stats?.pending || 0}\n` +
      `<b>Failed:</b> ${stats?.failed || 0}`;

    return sendTelegramNotification(service, { text });
  } catch (error) {
    console.error('[NotificationService] Status command error:', error);
    return sendTelegramNotification(service, {
      text: '❌ Failed to fetch status. Please try again later.',
    });
  }
}

export async function handleApproveCommand(service, chatId, args) {
  const applicationId = args[0];
  if (!applicationId) {
    return sendTelegramNotification(service, {
      text: '⚠️ Usage: /approve <application_id>',
    });
  }

  const result = await approveApplication(service, applicationId);
  return sendTelegramNotification(service, { text: result.message });
}

export async function handleRejectCommand(service, chatId, args) {
  const applicationId = args[0];
  if (!applicationId) {
    return sendTelegramNotification(service, {
      text: '⚠️ Usage: /reject <application_id>',
    });
  }

  const result = await rejectApplication(service, applicationId);
  return sendTelegramNotification(service, { text: result.message });
}

export async function handlePauseCommand(service, _chatId) {
  await service.env.SESSIONS.put('config:auto-apply:paused', 'true', { expirationTtl: 86400 });
  return sendTelegramNotification(service, {
    text: '⏸️ Auto-apply paused. Use /resume to continue.',
  });
}

export async function handleResumeCommand(service, _chatId) {
  await service.env.SESSIONS.put('config:auto-apply:paused', 'false', { expirationTtl: 86400 });
  return sendTelegramNotification(service, {
    text: '▶️ Auto-apply resumed.',
  });
}

export async function handleHelpCommand(service, _chatId) {
  const text =
    '🤖 <b>Job Automation Bot Commands</b>\n\n' +
    "<b>/status</b> - Show today's applications\n" +
    '<b>/approve &lt;id&gt;</b> - Approve pending application\n' +
    '<b>/reject &lt;id&gt;</b> - Reject pending application\n' +
    '<b>/pause</b> - Pause auto-apply\n' +
    '<b>/resume</b> - Resume auto-apply\n' +
    '<b>/help</b> - Show this help message';

  return sendTelegramNotification(service, { text });
}
