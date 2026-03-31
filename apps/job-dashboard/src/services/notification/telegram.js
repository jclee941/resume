/**
 * Telegram Notification Service (Legacy)
 *
 * This file is kept for backward compatibility.
 * For new code, use the NotificationService from '../notifications.js'
 *
 * @deprecated Use NotificationService from '../notifications.js' instead
 */

import {
  NotificationService,
  sendTelegramNotification as newSendTelegramNotification,
  escapeHtml as newEscapeHtml,
} from '../notifications.js';

const TELEGRAM_MAX_LENGTH = 4096;

/**
 * @deprecated Use escapeHtml from '../notifications.js' instead
 */
function escapeHtml(text) {
  return newEscapeHtml(text);
}

/**
 * @deprecated Use NotificationService.sendTelegramNotification() instead
 */
async function sendTelegramNotification(env, message) {
  console.log('[Notification:deprecated] Using legacy sendTelegramNotification');
  return newSendTelegramNotification(env, message);
}

export { escapeHtml, sendTelegramNotification };
export default { sendTelegramNotification, escapeHtml };
