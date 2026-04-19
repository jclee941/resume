/**
 * Notification Service for Job Dashboard
 * Dual-channel support: Telegram Bot API + n8n Webhooks
 * Features: Approval gates, action buttons, notification history, preferences
 */

import { TokenBucketRateLimiter } from './rate-limiter/token-bucket.js';
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
  triggerN8nWebhook,
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

export class NotificationService {
  constructor(env) {
    this.env = env;
    this.telegramToken = env?.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = env?.TELEGRAM_CHAT_ID;
    this.n8nWebhookUrl = env?.N8N_WEBHOOK_URL || env?.N8N_URL;
    this.rateLimiter = new TokenBucketRateLimiter(env, {
      capacity: 20,
      refillRate: 20 / 60,
      keyPrefix: 'rate_limit:telegram',
      ttlSeconds: 60,
    });
    this.preferences = createDefaultNotificationPreferences();
  }

  isEnabled(eventType) {
    const preference = this.preferences[eventType];
    return preference?.enabled ?? true;
  }

  getChannels(eventType) {
    const preference = this.preferences[eventType];
    const channels = preference?.channels || [NotificationChannel.TELEGRAM];
    return channels.filter((channel) => {
      if (channel === NotificationChannel.TELEGRAM) {
        return !!(this.telegramToken && this.telegramChatId);
      }
      if (channel === NotificationChannel.N8N) {
        return !!this.n8nWebhookUrl;
      }
      return true;
    });
  }

  async checkRateLimit(chatId) {
    return checkRateLimit(this, chatId);
  }
  async recordMessageSent(chatId) {
    return recordMessageSent(this, chatId);
  }
  async enqueueNotification(job, options = {}) {
    const queueJob = {
      id: job.id || crypto.randomUUID(),
      type: job.type || 'telegram',
      priority: job.priority || 'normal',
      payload: job.payload,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: job.maxAttempts || 3,
    };

    await this.env.NOTIFICATION_QUEUE.send(queueJob, {
      delaySeconds: options.delaySeconds || 0,
    });

    return { queued: true, jobId: queueJob.id };
  }

  async notify(eventType, data, options = {}) {
    return notify(this, eventType, data, options);
  }
  async sendApprovalRequest(job, matchScore, applicationId) {
    return sendApprovalRequest(this, job, matchScore, applicationId);
  }
  async sendApplicationSuccess(job, applicationId, platform) {
    return sendApplicationSuccess(this, job, applicationId, platform);
  }
  async sendApplicationFailed(job, applicationId, error, platform) {
    return sendApplicationFailed(this, job, applicationId, error, platform);
  }
  async sendDailySummary(stats) {
    return sendDailySummary(this, stats);
  }
  async sendCaptchaDetected(job, platform) {
    return sendCaptchaDetected(this, job, platform);
  }
  async sendResumeSync(platform, resumeId, success = true) {
    return sendResumeSync(this, platform, resumeId, success);
  }
  async sendTelegramNotification(data, options = {}) {
    return deliverTelegramNotification(this, data, options);
  }
  async triggerN8nWebhook(event, data) {
    return triggerN8nWebhook(this, event, data);
  }
  async handleTelegramCommand(command, args, message) {
    return handleTelegramCommand(this, command, args, message);
  }
  async handleTelegramCallback(query) {
    return handleTelegramCallback(this, query);
  }
  async handleStatusCommand(chatId) {
    return handleStatusCommand(this, chatId);
  }
  async handleApproveCommand(chatId, args) {
    return handleApproveCommand(this, chatId, args);
  }
  async handleRejectCommand(chatId, args) {
    return handleRejectCommand(this, chatId, args);
  }
  async handlePauseCommand(chatId) {
    return handlePauseCommand(this, chatId);
  }
  async handleResumeCommand(chatId) {
    return handleResumeCommand(this, chatId);
  }
  async handleHelpCommand(chatId) {
    return handleHelpCommand(this, chatId);
  }
  async approveApplication(applicationId) {
    return approveApplication(this, applicationId);
  }
  async rejectApplication(applicationId) {
    return rejectApplication(this, applicationId);
  }
  async viewApplicationDetails(applicationId) {
    return viewApplicationDetails(this, applicationId);
  }
  async answerCallbackQuery(callbackQueryId, text) {
    return answerCallbackQuery(this, callbackQueryId, text);
  }
  async saveNotificationHistory(record) {
    return saveNotificationHistory(this, record);
  }
  async getNotificationHistory(options = {}) {
    return getNotificationHistory(this, options);
  }
  async updatePreferences(eventType, preferences) {
    return updatePreferences(this, eventType, preferences);
  }
  async loadPreferences() {
    return loadPreferences(this);
  }
  sanitizeData(data) {
    return sanitizeData(data);
  }
  determineStatus(results) {
    return determineStatus(results);
  }
}

export async function sendTelegramNotification(env, message) {
  return new NotificationService(env).sendTelegramNotification(message);
}

export default NotificationService;
