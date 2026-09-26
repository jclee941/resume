/**
 * Notification Service for Job Dashboard
 * Dual-channel support: Telegram Bot API + automation webhooks
 * Features: Approval gates, action buttons, notification history, preferences
 */

import { TokenBucketRateLimiter } from '@resume/shared/rate-limit';
import {
  createDefaultNotificationPreferences,
  NotificationChannel,
  NotificationEvent,
} from './notifications/constants.js';
import {
  answerCallbackQuery,
  checkRateLimit,
  recordMessageSent,
  sendTelegramNotification as deliverTelegramNotification,
  triggerAutomationWebhook,
} from './notifications/delivery.js';
import {
  notify,
  sendApprovalRequest,
  sendApplicationFailed,
  sendApplicationSuccess,
  sendCaptchaDetected,
  sendDailySummary,
  sendResumeSync,
} from './notifications/event-notifications.js';
import { escapeHtml, sanitizeData, determineStatus } from './notifications/formatters.js';
import {
  getNotificationHistory,
  loadPreferences,
  saveNotificationHistory,
  updatePreferences,
} from './notifications/history-preferences.js';
import {
  approveApplication,
  rejectApplication,
  viewApplicationDetails,
} from './notifications/application-actions.js';
import {
  handleApproveCommand,
  handleHelpCommand,
  handlePauseCommand,
  handleRejectCommand,
  handleResumeCommand,
  handleStatusCommand,
  handleTelegramCallback,
  handleTelegramCommand,
} from './notifications/telegram-commands.js';

export { NotificationEvent, NotificationChannel, escapeHtml };

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       run(): Promise<{ meta?: { changes?: number } }>;
 *       all(): Promise<{ results?: unknown[] }>;
 *       first(): Promise<Record<string, unknown> | null>;
 *     };
 *   };
 * }} D1DatabaseLike
 */

/**
 * @typedef {{
 *   get(key: string, options?: { type?: string } | string): Promise<{ tokens?: number; lastRefill?: number; [key: string]: unknown } | null>;
 *   put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
 * }} KvNamespaceLike
 */

/**
 * @typedef {{
 *   channels?: string[];
 *   enabled?: boolean;
 * }} NotificationPreference
 */

/**
 * @typedef {Record<string, unknown> & {
 *   TELEGRAM_BOT_TOKEN?: string;
 *   TELEGRAM_CHAT_ID?: string | number;
 *   AUTOMATION_WEBHOOK_URL?: string;
 *   WEBHOOK_URL?: string;
 *   JOB_DB: D1DatabaseLike;
 *   SESSIONS: KvNamespaceLike;
 * }} NotificationEnv
 */

export class NotificationService {
  /**
   * @param {NotificationEnv} [env]
   */
  constructor(env) {
    /** @type {NotificationEnv} */
    this.env = /** @type {NotificationEnv} */ (env);
    /** @type {string | undefined} */
    this.telegramToken = env?.TELEGRAM_BOT_TOKEN;
    /** @type {string | number | undefined} */
    this.telegramChatId = env?.TELEGRAM_CHAT_ID;
    /** @type {string | undefined} */
    this.automationWebhookUrl = env?.AUTOMATION_WEBHOOK_URL || env?.WEBHOOK_URL;
    /** @type {TokenBucketRateLimiter} */
    this.rateLimiter = new TokenBucketRateLimiter(
      /** @type {import('@resume/shared/rate-limit/kv-token-bucket').TokenBucketEnv | undefined} */ (
        env
      ),
      {
        capacity: 20,
        refillRate: 20 / 60,
        keyPrefix: 'rate_limit:telegram',
        ttlSeconds: 60,
      }
    );
    /** @type {Record<string, NotificationPreference> & Record<string, unknown>} */
    this.preferences = createDefaultNotificationPreferences();
  }

  /**
   * @param {string} eventType
   * @returns {boolean}
   */
  isEnabled(eventType) {
    const preference = this.preferences[eventType];
    return preference?.enabled ?? true;
  }

  /**
   * @param {string} eventType
   * @returns {string[]}
   */
  getChannels(eventType) {
    const preference = this.preferences[eventType];
    const channels = preference?.channels || [NotificationChannel.TELEGRAM];
    return channels.filter((channel) => {
      if (channel === NotificationChannel.TELEGRAM) {
        return !!(this.telegramToken && this.telegramChatId);
      }
      if (channel === NotificationChannel.WEBHOOK) {
        return !!this.automationWebhookUrl;
      }
      return true;
    });
  }

  /**
   * @param {string | number} chatId
   * @returns {Promise<unknown>}
   */
  async checkRateLimit(chatId) {
    return checkRateLimit(this, chatId);
  }

  /**
   * @param {string | number} chatId
   * @returns {Promise<void>}
   */
  async recordMessageSent(chatId) {
    return recordMessageSent(this, chatId);
  }

  /**
   * @param {string} eventType
   * @param {Record<string, unknown>} data
   * @param {Record<string, unknown>} [options]
   * @returns {Promise<unknown>}
   */
  async notify(eventType, data, options = {}) {
    return notify(this, eventType, data, options);
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {number} matchScore
   * @param {string} applicationId
   * @returns {Promise<unknown>}
   */
  async sendApprovalRequest(job, matchScore, applicationId) {
    return sendApprovalRequest(this, job, matchScore, applicationId);
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {string} applicationId
   * @param {string} platform
   * @returns {Promise<unknown>}
   */
  async sendApplicationSuccess(job, applicationId, platform) {
    return sendApplicationSuccess(this, job, applicationId, platform);
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {string} applicationId
   * @param {unknown} error
   * @param {string} platform
   * @returns {Promise<unknown>}
   */
  async sendApplicationFailed(job, applicationId, error, platform) {
    return sendApplicationFailed(this, job, applicationId, error, platform);
  }

  /**
   * @param {Record<string, unknown>} stats
   * @returns {Promise<unknown>}
   */
  async sendDailySummary(stats) {
    return sendDailySummary(this, stats);
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {string} platform
   * @returns {Promise<unknown>}
   */
  async sendCaptchaDetected(job, platform) {
    return sendCaptchaDetected(this, job, platform);
  }

  /**
   * @param {string} platform
   * @param {string} resumeId
   * @param {boolean} [success]
   * @returns {Promise<unknown>}
   */
  async sendResumeSync(platform, resumeId, success = true) {
    return sendResumeSync(this, platform, resumeId, success);
  }

  /**
   * @param {Parameters<typeof deliverTelegramNotification>[1]} data
   * @param {Parameters<typeof deliverTelegramNotification>[2]} [options]
   * @returns {Promise<unknown>}
   */
  async sendTelegramNotification(data, options = {}) {
    return deliverTelegramNotification(this, data, options);
  }

  /**
   * @param {string} event
   * @param {Record<string, unknown> | null | undefined} data
   * @returns {Promise<unknown>}
   */
  async triggerAutomationWebhook(event, data) {
    return triggerAutomationWebhook(this, event, data);
  }

  /**
   * @param {string} command
   * @param {string[]} args
   * @param {import('./notifications/telegram-commands.js').TelegramMessage} message
   * @returns {Promise<unknown>}
   */
  async handleTelegramCommand(command, args, message) {
    return handleTelegramCommand(this, command, args, message);
  }

  /**
   * @param {import('./notifications/telegram-commands.js').TelegramCallbackQuery} query
   * @returns {Promise<unknown>}
   */
  async handleTelegramCallback(query) {
    return handleTelegramCallback(this, query);
  }

  /**
   * @param {string | number | undefined} [chatId]
   * @returns {Promise<unknown>}
   */
  async handleStatusCommand(chatId) {
    return handleStatusCommand(this, chatId);
  }

  /**
   * @param {string | number | undefined} chatId
   * @param {string[]} args
   * @returns {Promise<unknown>}
   */
  async handleApproveCommand(chatId, args) {
    return handleApproveCommand(this, chatId, args);
  }

  /**
   * @param {string | number | undefined} chatId
   * @param {string[]} args
   * @returns {Promise<unknown>}
   */
  async handleRejectCommand(chatId, args) {
    return handleRejectCommand(this, chatId, args);
  }

  /**
   * @param {string | number | undefined} [chatId]
   * @returns {Promise<unknown>}
   */
  async handlePauseCommand(chatId) {
    return handlePauseCommand(this, chatId);
  }

  /**
   * @param {string | number | undefined} [chatId]
   * @returns {Promise<unknown>}
   */
  async handleResumeCommand(chatId) {
    return handleResumeCommand(this, chatId);
  }

  /**
   * @param {string | number | undefined} [chatId]
   * @returns {Promise<unknown>}
   */
  async handleHelpCommand(chatId) {
    return handleHelpCommand(this, chatId);
  }

  /**
   * @param {string} applicationId
   * @returns {Promise<unknown>}
   */
  async approveApplication(applicationId) {
    return approveApplication(this, applicationId);
  }

  /**
   * @param {string} applicationId
   * @returns {Promise<unknown>}
   */
  async rejectApplication(applicationId) {
    return rejectApplication(this, applicationId);
  }

  /**
   * @param {string} applicationId
   * @returns {Promise<unknown>}
   */
  async viewApplicationDetails(applicationId) {
    return viewApplicationDetails(this, applicationId);
  }

  /**
   * @param {string} callbackQueryId
   * @param {string} [text]
   * @returns {Promise<unknown>}
   */
  async answerCallbackQuery(callbackQueryId, text) {
    return answerCallbackQuery(this, callbackQueryId, text);
  }

  /**
   * @param {import('./notifications/history-preferences.js').NotificationHistoryRecord} record
   * @returns {Promise<unknown>}
   */
  async saveNotificationHistory(record) {
    return saveNotificationHistory(this, record);
  }

  /**
   * @param {Record<string, unknown>} [options]
   * @returns {Promise<unknown>}
   */
  async getNotificationHistory(options = {}) {
    return getNotificationHistory(this, options);
  }

  /**
   * @param {string} eventType
   * @param {Record<string, unknown>} preferences
   * @returns {Promise<unknown>}
   */
  async updatePreferences(eventType, preferences) {
    return updatePreferences(this, eventType, preferences);
  }

  /**
   * @returns {Promise<unknown>}
   */
  async loadPreferences() {
    return loadPreferences(this);
  }

  /**
   * @param {Record<string, unknown> | null | undefined} data
   * @returns {Record<string, unknown> | null | undefined}
   */
  sanitizeData(data) {
    return sanitizeData(data);
  }

  /**
   * @param {Record<string, { sent?: boolean } | null | undefined>} results
   * @returns {'failed' | 'partial' | 'success'}
   */
  determineStatus(results) {
    return determineStatus(results);
  }
}

/**
 * @param {NotificationEnv} env
 * @param {Parameters<typeof deliverTelegramNotification>[1]} message
 * @returns {Promise<unknown>}
 */
export async function sendTelegramNotification(env, message) {
  return new NotificationService(env).sendTelegramNotification(message);
}

export default NotificationService;
