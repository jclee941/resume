/**
 * Notification Service for Job Dashboard
 * Dual-channel support: Telegram Bot API + n8n Webhooks
 * Features: Approval gates, action buttons, notification history, preferences
 */

const TELEGRAM_MAX_LENGTH = 4096;
const N8N_TIMEOUT_MS = 10000;
const TELEGRAM_TIMEOUT_MS = 10000;

// Rate limiting: 20 messages per minute per chat
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const messageTimestamps = new Map(); // chatId -> [timestamps]

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * Check rate limit for a chat
 */
function checkRateLimit(chatId) {
  const now = Date.now();
  const timestamps = messageTimestamps.get(chatId) || [];
  
  // Remove timestamps outside the window
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= RATE_LIMIT_MAX) {
    const oldestTimestamp = validTimestamps[0];
    const waitTime = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
    return { allowed: false, waitTime };
  }
  
  return { allowed: true, remaining: RATE_LIMIT_MAX - validTimestamps.length };
}

/**
 * Record message sent for rate limiting
 */
function recordMessageSent(chatId) {
  const now = Date.now();
  const timestamps = messageTimestamps.get(chatId) || [];
  timestamps.push(now);
  messageTimestamps.set(chatId, timestamps);
}

/**
 * Sleep utility for delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error, status) {
  // Network errors
  if (error.name === 'TypeError' || error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    return true;
  }
  // HTTP status codes
  if (status === 429 || status >= 500) {
    return true;
  }
  return false;
}
const N8N_TIMEOUT_MS = 10000;
const TELEGRAM_TIMEOUT_MS = 10000;

/**
 * Notification event types
 */
export const NotificationEvent = {
  APPROVAL_REQUIRED: 'approval_required',
  APPLICATION_SUCCESS: 'application_success',
  APPLICATION_FAILED: 'application_failed',
  DAILY_SUMMARY: 'daily_summary',
  CAPTCHA_DETECTED: 'captcha_detected',
  JOB_STARTED: 'job_started',
  JOB_COMPLETED: 'job_completed',
  RESUME_SYNC: 'resume_sync',
};

/**
 * Notification channels
 */
export const NotificationChannel = {
  TELEGRAM: 'telegram',
  N8N: 'n8n',
  BOTH: 'both',
};

/**
 * Escape HTML for Telegram messages
 */
export function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Format notification text with proper escaping
 */
function formatNotificationText(message) {
  let text;

  if (typeof message === 'string') {
    text = message;
  } else if (message && typeof message === 'object') {
    if (typeof message.text === 'string') {
      text = message.text;
    } else {
      try {
        text = JSON.stringify(message, null, 2);
      } catch {
        text = String(message);
      }
    }
  } else {
    text = String(message ?? '');
  }

  // Escape HTML entities unless message already contains intentional Telegram HTML tags
  const hasHtmlTags =
    /<(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote)[\s>]/i.test(text);
  const hasCallbackButtons = text.includes('callback_data');

  if (!hasHtmlTags && !hasCallbackButtons) {
    text = escapeHtml(text);
  }

  // Truncate to Telegram's 4096 char limit
  if (text.length > TELEGRAM_MAX_LENGTH) {
    text = `${text.slice(0, TELEGRAM_MAX_LENGTH - 20)}\n\n[...truncated]`;
  }

  return text;
}

/**
 * Notification Service Class
 * Handles both Telegram and n8n notification channels
 */
export class NotificationService {
  constructor(env) {
    this.env = env;
    this.telegramToken = env?.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = env?.TELEGRAM_CHAT_ID;
    this.n8nWebhookUrl = env?.N8N_WEBHOOK_URL || env?.N8N_URL;

    // Notification preferences (default: both channels enabled)
    this.preferences = {
      approval_required: { channels: [NotificationChannel.BOTH], enabled: true },
      application_success: { channels: [NotificationChannel.BOTH], enabled: true },
      application_failed: { channels: [NotificationChannel.BOTH], enabled: true },
      daily_summary: { channels: [NotificationChannel.TELEGRAM], enabled: true },
      captcha_detected: { channels: [NotificationChannel.BOTH], enabled: true },
      job_started: { channels: [NotificationChannel.N8N], enabled: false },
      job_completed: { channels: [NotificationChannel.N8N], enabled: false },
      resume_sync: { channels: [NotificationChannel.BOTH], enabled: true },
    };
  }

  /**
   * Check if notification is enabled for event type
   */
  isEnabled(eventType) {
    const pref = this.preferences[eventType];
    return pref?.enabled ?? true;
  }

  /**
   * Get channels for event type
   */
  getChannels(eventType) {
    const pref = this.preferences[eventType];
    const channels = pref?.channels || [NotificationChannel.TELEGRAM];

    // Filter out unavailable channels
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

  /**
   * Send notification through specified channels
   */
  async notify(eventType, data, options = {}) {
    if (!this.isEnabled(eventType)) {
      return { sent: false, reason: 'disabled' };
    }

    const channels = options.channels || this.getChannels(eventType);
    const results = {};

    // Record notification history
    const historyRecord = {
      id: crypto.randomUUID(),
      eventType,
      data: this.sanitizeData(data),
      channels,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    // Send to Telegram
    if (
      channels.includes(NotificationChannel.TELEGRAM) ||
      channels.includes(NotificationChannel.BOTH)
    ) {
      results.telegram = await this.sendTelegramNotification(data, options.telegram);
    }

    // Send to n8n
    if (channels.includes(NotificationChannel.N8N) || channels.includes(NotificationChannel.BOTH)) {
      results.n8n = await this.triggerN8nWebhook(eventType, data);
    }

    // Update history record
    historyRecord.status = this.determineStatus(results);
    historyRecord.results = results;

    // Save to D1 (non-blocking)
    this.saveNotificationHistory(historyRecord).catch((err) => {
      console.error('[NotificationService] Failed to save history:', err.message);
    });

    return {
      sent: historyRecord.status === 'success' || historyRecord.status === 'partial',
      historyId: historyRecord.id,
      results,
      status: historyRecord.status,
    };
  }

  /**
   * Send approval request notification
   * Match score 60-74: requires human review
   */
  async sendApprovalRequest(job, matchScore, applicationId) {
    const message = {
      text:
        `🔔 <b>Job Application Approval Request</b>\n\n` +
        `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
        `<b>Company:</b> ${escapeHtml(job.company)}\n` +
        `<b>Platform:</b> ${escapeHtml(job.platform || job.source)}\n` +
        `<b>Match Score:</b> ${matchScore}/100\n\n` +
        `<b>Actions:</b> Click buttons below to approve or reject`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve:${applicationId}` },
            { text: '❌ Reject', callback_data: `reject:${applicationId}` },
          ],
          [{ text: '📋 View Details', callback_data: `view:${applicationId}` }],
        ],
      },
    };

    return this.notify(
      NotificationEvent.APPROVAL_REQUIRED,
      {
        job,
        matchScore,
        applicationId,
        message,
      },
      {
        telegram: message,
      }
    );
  }

  /**
   * Send application success notification
   */
  async sendApplicationSuccess(job, applicationId, platform) {
    const data = {
      job,
      applicationId,
      platform,
      timestamp: new Date().toISOString(),
    };

    const telegramMessage = {
      text:
        `✅ <b>Application Submitted Successfully</b>\n\n` +
        `<b>Company:</b> ${escapeHtml(job.company)}\n` +
        `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
        `<b>Platform:</b> ${escapeHtml(platform)}\n` +
        `<b>Application ID:</b> <code>${applicationId}</code>`,
      parse_mode: 'HTML',
    };

    return this.notify(NotificationEvent.APPLICATION_SUCCESS, data, {
      telegram: telegramMessage,
    });
  }

  /**
   * Send application failure notification
   */
  async sendApplicationFailed(job, applicationId, error, platform) {
    const data = {
      job,
      applicationId,
      error: error?.message || String(error),
      platform,
      timestamp: new Date().toISOString(),
    };

    const telegramMessage = {
      text:
        `❌ <b>Application Failed</b>\n\n` +
        `<b>Company:</b> ${escapeHtml(job.company)}\n` +
        `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
        `<b>Platform:</b> ${escapeHtml(platform)}\n` +
        `<b>Error:</b> <pre>${escapeHtml(data.error)}</pre>`,
      parse_mode: 'HTML',
    };

    return this.notify(NotificationEvent.APPLICATION_FAILED, data, {
      telegram: telegramMessage,
    });
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummary(stats) {
    const data = {
      ...stats,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
    };

    const telegramMessage = {
      text:
        `📊 <b>Daily Application Summary</b>\n\n` +
        `<b>Date:</b> ${data.date}\n` +
        `<b>Total Applied:</b> ${stats.applied || 0}\n` +
        `<b>Pending Approval:</b> ${stats.pending || 0}\n` +
        `<b>Failed:</b> ${stats.failed || 0}\n` +
        `<b>Success Rate:</b> ${stats.successRate || 0}%`,
      parse_mode: 'HTML',
    };

    return this.notify(NotificationEvent.DAILY_SUMMARY, data, {
      telegram: telegramMessage,
      channels: [NotificationChannel.TELEGRAM],
    });
  }

  /**
   * Send CAPTCHA detected notification
   */
  async sendCaptchaDetected(job, platform) {
    const data = {
      job,
      platform,
      timestamp: new Date().toISOString(),
    };

    const telegramMessage = {
      text:
        `🤖 <b>CAPTCHA Detected - Manual Intervention Required</b>\n\n` +
        `<b>Company:</b> ${escapeHtml(job.company)}\n` +
        `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
        `<b>Platform:</b> ${escapeHtml(platform)}\n\n` +
        `Please check the platform manually to continue.`,
      parse_mode: 'HTML',
    };

    return this.notify(NotificationEvent.CAPTCHA_DETECTED, data, {
      telegram: telegramMessage,
    });
  }

  /**
   * Send resume sync notification
   */
  async sendResumeSync(platform, resumeId, success = true) {
    const platformNames = {
      wanted: '원티드',
      jobkorea: '잡코리아',
      saramin: '사람인',
      remember: '리멤버',
    };

    const data = {
      platform,
      platformName: platformNames[platform] || platform,
      resumeId,
      success,
      timestamp: new Date().toISOString(),
    };

    const icon = success ? '✅' : '❌';
    const status = success ? 'completed' : 'failed';

    const telegramMessage = {
      text:
        `${icon} <b>Resume Sync ${status.toUpperCase()}</b>\n\n` +
        `<b>Platform:</b> ${platformNames[platform] || platform}\n` +
        `<b>Resume ID:</b> <code>${resumeId}</code>`,
      parse_mode: 'HTML',
    };

    return this.notify(NotificationEvent.RESUME_SYNC, data, {
      telegram: telegramMessage,
    });
  }

  /**
   * Send Telegram notification with optional inline keyboard and retry logic
   */
  async sendTelegramNotification(data, options = {}) {
    if (!this.telegramToken || !this.telegramChatId) {
      console.log('[NotificationService] Telegram not configured');
      return { sent: false, reason: 'not_configured' };
    }

    // Check rate limit
    const rateCheck = checkRateLimit(this.telegramChatId);
    if (!rateCheck.allowed) {
      console.warn(`[NotificationService] Rate limit exceeded. Wait ${rateCheck.waitTime}ms`);
      return { sent: false, reason: 'rate_limited', waitTime: rateCheck.waitTime };
    }

    const endpoint = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;

    let body = {
      chat_id: this.telegramChatId,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: true,
    };

    // Handle different message formats
    if (options.text || typeof data === 'string') {
      body.text = formatNotificationText(options.text || data);
    } else if (data.text) {
      body.text = formatNotificationText(data.text);
    } else {
      body.text = formatNotificationText(data);
    }

    // Add reply markup if provided
    if (options.reply_markup || data.reply_markup) {
      body.reply_markup = options.reply_markup || data.reply_markup;
    }

    // Retry logic
    let lastError = null;
    let lastStatus = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          lastStatus = response.status;
          
          // Check if we should retry
          if (attempt < MAX_RETRIES && (response.status === 429 || response.status >= 500)) {
            console.warn(`[NotificationService] Telegram error ${response.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`);
            lastError = new Error(`HTTP ${response.status}: ${errorBody}`);
            await sleep(RETRY_DELAYS[attempt]);
            continue;
          }
          
          console.error('[NotificationService] Telegram error:', response.status, errorBody);
          return {
            sent: false,
            reason: 'http_error',
            status: response.status,
            error: errorBody,
            attempts: attempt + 1,
          };
        }

        const result = await response.json();
        recordMessageSent(this.telegramChatId);
        return {
          sent: true,
          messageId: result.result?.message_id,
          attempts: attempt + 1,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        
        // Check if we should retry
        if (attempt < MAX_RETRIES && isRetryableError(error)) {
          console.warn(`[NotificationService] Telegram network error, retrying (${attempt + 1}/${MAX_RETRIES})...`);
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        
        console.error('[NotificationService] Telegram error:', error.message);
        return {
          sent: false,
          reason: error.name === 'AbortError' ? 'timeout' : 'fetch_error',
          error: error.message,
          attempts: attempt + 1,
        };
      }
    }
    
    // All retries exhausted
    return {
      sent: false,
      reason: 'max_retries_exceeded',
      error: lastError?.message || 'Unknown error',
      attempts: MAX_RETRIES + 1,
    };
  }
   * Send Telegram notification with optional inline keyboard
   */
  async sendTelegramNotification(data, options = {}) {
    if (!this.telegramToken || !this.telegramChatId) {
      console.log('[NotificationService] Telegram not configured');
      return { sent: false, reason: 'not_configured' };
    }

    const endpoint = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;

    let body = {
      chat_id: this.telegramChatId,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: true,
    };

    // Handle different message formats
    if (options.text || typeof data === 'string') {
      body.text = formatNotificationText(options.text || data);
    } else if (data.text) {
      body.text = formatNotificationText(data.text);
    } else {
      body.text = formatNotificationText(data);
    }

    // Add reply markup if provided
    if (options.reply_markup || data.reply_markup) {
      body.reply_markup = options.reply_markup || data.reply_markup;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[NotificationService] Telegram error:', response.status, errorBody);
        return {
          sent: false,
          reason: 'http_error',
          status: response.status,
          error: errorBody,
        };
      }

      const result = await response.json();
      return {
        sent: true,
        messageId: result.result?.message_id,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[NotificationService] Telegram error:', error.message);
      return {
        sent: false,
        reason: error.name === 'AbortError' ? 'timeout' : 'fetch_error',
        error: error.message,
      };
    }
  }

  /**
   * Trigger n8n webhook
   */
  async triggerN8nWebhook(event, data) {
    if (!this.n8nWebhookUrl) {
      console.log('[NotificationService] n8n not configured');
      return { sent: false, reason: 'not_configured' };
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data),
      source: 'job-dashboard',
      project: 'resume-monorepo',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'job-dashboard',
          'X-Event-Type': event,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[NotificationService] n8n webhook sent: ${event}`);
        return { sent: true };
      } else {
        const errorText = await response.text();
        console.warn(`[NotificationService] n8n webhook failed: ${response.status}`);
        return {
          sent: false,
          reason: 'http_error',
          status: response.status,
          error: errorText,
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('[NotificationService] n8n webhook error:', error.message);
      return {
        sent: false,
        reason: error.name === 'AbortError' ? 'timeout' : 'network_error',
        error: error.message,
      };
    }
  }

  /**
   * Handle Telegram bot commands
   */
  async handleTelegramCommand(command, args, message) {
    const chatId = message.chat?.id;

    switch (command.toLowerCase()) {
      case '/status':
        return this.handleStatusCommand(chatId);

      case '/approve':
        return this.handleApproveCommand(chatId, args);

      case '/reject':
        return this.handleRejectCommand(chatId, args);

      case '/pause':
        return this.handlePauseCommand(chatId);

      case '/resume':
        return this.handleResumeCommand(chatId);

      case '/help':
        return this.handleHelpCommand(chatId);

      default:
        return this.sendTelegramNotification({
          text: `Unknown command: ${command}\nUse /help for available commands.`,
        });
    }
  }

  /**
   * Handle Telegram callback queries (inline button clicks)
   */
  async handleTelegramCallback(query) {
    const { data, message } = query;
    const [action, applicationId] = data.split(':');

    if (!applicationId) {
      return { handled: false, reason: 'invalid_callback_data' };
    }

    let result;
    switch (action) {
      case 'approve':
        result = await this.approveApplication(applicationId);
        break;
      case 'reject':
        result = await this.rejectApplication(applicationId);
        break;
      case 'view':
        result = await this.viewApplicationDetails(applicationId);
        break;
      default:
        return { handled: false, reason: 'unknown_action' };
    }

    // Answer callback query
    await this.answerCallbackQuery(query.id, result.message);

    return { handled: true, action, applicationId, result };
  }

  /**
   * Handle /status command - Show today's applications
   */
  async handleStatusCommand(chatId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const stats = await this.env.DB.prepare(
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

      return this.sendTelegramNotification({ text });
    } catch (error) {
      console.error('[NotificationService] Status command error:', error);
      return this.sendTelegramNotification({
        text: '❌ Failed to fetch status. Please try again later.',
      });
    }
  }

  /**
   * Handle /approve command - Approve specific job
   */
  async handleApproveCommand(chatId, args) {
    const applicationId = args[0];
    if (!applicationId) {
      return this.sendTelegramNotification({
        text: '⚠️ Usage: /approve <application_id>',
      });
    }

    const result = await this.approveApplication(applicationId);
    return this.sendTelegramNotification({ text: result.message });
  }

  /**
   * Handle /reject command - Reject specific job
   */
  async handleRejectCommand(chatId, args) {
    const applicationId = args[0];
    if (!applicationId) {
      return this.sendTelegramNotification({
        text: '⚠️ Usage: /reject <application_id>',
      });
    }

    const result = await this.rejectApplication(applicationId);
    return this.sendTelegramNotification({ text: result.message });
  }

  /**
   * Handle /pause command - Pause auto-apply
   */
  async handlePauseCommand(chatId) {
    await this.env.SESSIONS.put('config:auto-apply:paused', 'true', { expirationTtl: 86400 });
    return this.sendTelegramNotification({
      text: '⏸️ Auto-apply paused. Use /resume to continue.',
    });
  }

  /**
   * Handle /resume command - Resume auto-apply
   */
  async handleResumeCommand(chatId) {
    await this.env.SESSIONS.put('config:auto-apply:paused', 'false', { expirationTtl: 86400 });
    return this.sendTelegramNotification({
      text: '▶️ Auto-apply resumed.',
    });
  }

  /**
   * Handle /help command
   */
  async handleHelpCommand(chatId) {
    const text =
      `🤖 <b>Job Automation Bot Commands</b>\n\n` +
      `<b>/status</b> - Show today's applications\n` +
      `<b>/approve &lt;id&gt;</b> - Approve pending application\n` +
      `<b>/reject &lt;id&gt;</b> - Reject pending application\n` +
      `<b>/pause</b> - Pause auto-apply\n` +
      `<b>/resume</b> - Resume auto-apply\n` +
      `<b>/help</b> - Show this help message`;

    return this.sendTelegramNotification({ text });
  }

  /**
   * Approve an application
   */
  async approveApplication(applicationId) {
    try {
      // Update application state
      await this.env.DB.prepare(
        `
        UPDATE applications 
        SET status = 'approved', approved_at = datetime('now')
        WHERE id = ?
      `
      )
        .bind(applicationId)
        .run();

      // Update workflow state
      const workflowKey = `workflow:application:${applicationId}`;
      const workflowState = await this.env.SESSIONS.get(workflowKey);

      if (workflowState) {
        const state = JSON.parse(workflowState);
        state.approved = true;
        state.approvedAt = new Date().toISOString();
        await this.env.SESSIONS.put(workflowKey, JSON.stringify(state), {
          expirationTtl: 86400 * 7,
        });
      }

      return { success: true, message: `✅ Application ${applicationId} approved.` };
    } catch (error) {
      console.error('[NotificationService] Approve error:', error);
      return { success: false, message: `❌ Failed to approve: ${error.message}` };
    }
  }

  /**
   * Reject an application
   */
  async rejectApplication(applicationId) {
    try {
      // Update application state
      await this.env.DB.prepare(
        `
        UPDATE applications 
        SET status = 'rejected', rejected_at = datetime('now')
        WHERE id = ?
      `
      )
        .bind(applicationId)
        .run();

      // Update workflow state
      const workflowKey = `workflow:application:${applicationId}`;
      const workflowState = await this.env.SESSIONS.get(workflowKey);

      if (workflowState) {
        const state = JSON.parse(workflowState);
        state.approved = false;
        state.rejectedAt = new Date().toISOString();
        await this.env.SESSIONS.put(workflowKey, JSON.stringify(state), {
          expirationTtl: 86400 * 7,
        });
      }

      return { success: true, message: `❌ Application ${applicationId} rejected.` };
    } catch (error) {
      console.error('[NotificationService] Reject error:', error);
      return { success: false, message: `❌ Failed to reject: ${error.message}` };
    }
  }

  /**
   * View application details
   */
  async viewApplicationDetails(applicationId) {
    try {
      const application = await this.env.DB.prepare(
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
        `📋 <b>Application Details</b>\n\n` +
        `<b>ID:</b> <code>${application.id}</code>\n` +
        `<b>Company:</b> ${escapeHtml(application.company)}\n` +
        `<b>Position:</b> ${escapeHtml(application.position)}\n` +
        `<b>Platform:</b> ${escapeHtml(application.source)}\n` +
        `<b>Status:</b> ${application.status}\n` +
        `<b>Applied:</b> ${application.applied_at || 'N/A'}`;

      await this.sendTelegramNotification({ text });
      return { success: true, message: 'Details sent.' };
    } catch (error) {
      console.error('[NotificationService] View error:', error);
      return { success: false, message: `Failed to fetch details: ${error.message}` };
    }
  }

  /**
   * Answer Telegram callback query
   */
  async answerCallbackQuery(callbackQueryId, text) {
    if (!this.telegramToken) return;

    const endpoint = `https://api.telegram.org/bot${this.telegramToken}/answerCallbackQuery`;

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
        }),
      });
    } catch (error) {
      console.error('[NotificationService] Answer callback error:', error);
    }
  }

  /**
   * Save notification history to D1
   */
  async saveNotificationHistory(record) {
    if (!this.env.DB) return;

    try {
      await this.env.DB.prepare(
        `
        INSERT INTO notification_history (
          id, event_type, data, channels, timestamp, status, results
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          record.id,
          record.eventType,
          JSON.stringify(record.data),
          JSON.stringify(record.channels),
          record.timestamp,
          record.status,
          JSON.stringify(record.results)
        )
        .run();
    } catch (error) {
      console.error('[NotificationService] Save history error:', error);
      throw error;
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(options = {}) {
    const { limit = 50, eventType, startDate, endDate } = options;

    let sql = 'SELECT * FROM notification_history WHERE 1=1';
    const params = [];

    if (eventType) {
      sql += ' AND event_type = ?';
      params.push(eventType);
    }
    if (startDate) {
      sql += ' AND timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND timestamp <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const result = await this.env.DB.prepare(sql)
      .bind(...params)
      .all();
    return result.results || [];
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(eventType, preferences) {
    if (this.preferences[eventType]) {
      this.preferences[eventType] = { ...this.preferences[eventType], ...preferences };

      // Save to KV
      await this.env.SESSIONS.put(
        'config:notification:preferences',
        JSON.stringify(this.preferences),
        { expirationTtl: 86400 * 30 }
      );

      return { success: true };
    }
    return { success: false, reason: 'invalid_event_type' };
  }

  /**
   * Load notification preferences from KV
   */
  async loadPreferences() {
    try {
      const saved = await this.env.SESSIONS.get('config:notification:preferences', 'json');
      if (saved) {
        this.preferences = { ...this.preferences, ...saved };
      }
    } catch (error) {
      console.error('[NotificationService] Load preferences error:', error);
    }
  }

  /**
   * Sanitize data for storage (remove sensitive fields)
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = ['password', 'token', 'cookie', 'secret', 'key', 'auth'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Determine overall status from results
   */
  determineStatus(results) {
    const values = Object.values(results);
    if (values.length === 0) return 'failed';

    const allSuccess = values.every((r) => r?.sent);
    const someSuccess = values.some((r) => r?.sent);

    if (allSuccess) return 'success';
    if (someSuccess) return 'partial';
    return 'failed';
  }
}

/**
 * Legacy compatibility: Simple Telegram notification function
 */
export async function sendTelegramNotification(env, message) {
  const service = new NotificationService(env);
  return service.sendTelegramNotification(message);
}

export default NotificationService;
