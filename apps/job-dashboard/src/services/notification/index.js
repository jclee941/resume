/**
 * Notification Service for Job Dashboard
 * Dual-channel support: Telegram Bot API + n8n Webhooks
 * Features: Approval gates, action buttons, notification history, preferences
 *
 * This is the main notification service that consolidates all notification functionality.
 * For legacy code, the sendTelegramNotification function is also exported from this module.
 */

import {
  NotificationService,
  NotificationEvent,
  NotificationChannel,
  sendTelegramNotification,
  escapeHtml,
} from '../notifications.js';

// Re-export everything from the main notifications module
export {
  NotificationService,
  NotificationEvent,
  NotificationChannel,
  sendTelegramNotification,
  escapeHtml,
};

// Default export
export default NotificationService;
