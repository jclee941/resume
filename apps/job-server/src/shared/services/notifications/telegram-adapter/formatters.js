import { TELEGRAM_ALLOWED_HTML_TAGS, TELEGRAM_MAX_LENGTH } from './constants.js';

export function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatNotificationText(message) {
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

  if (!TELEGRAM_ALLOWED_HTML_TAGS.test(text)) {
    text = escapeHtml(text);
  }

  if (text.length > TELEGRAM_MAX_LENGTH) {
    text = `${text.slice(0, TELEGRAM_MAX_LENGTH - 20)}\n\n[...truncated]`;
  }

  return text;
}

export function resolveJobField(job, ...keys) {
  for (const key of keys) {
    if (job?.[key] != null && job[key] !== '') return job[key];
  }

  return '';
}

export function createApprovalRequestMessage(job, matchScore, applicationId) {
  return {
    text:
      '🔔 <b>Job Application Approval Request</b>\n\n' +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Platform:</b> ${escapeHtml(resolveJobField(job, 'platform', 'source'))}\n` +
      `<b>Match Score:</b> ${matchScore}/100\n` +
      `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>\n\n` +
      '<b>Actions:</b> Approve or reject below',
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
}

export function createApplicationSuccessMessage(job, applicationId, platform) {
  return {
    text:
      '✅ <b>Application Submitted Successfully</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n` +
      `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>`,
    parse_mode: 'HTML',
  };
}

export function createApplicationFailedMessage(job, applicationId, error, platform) {
  const errorText = error?.message || String(error || 'Unknown error');

  return {
    text:
      '❌ <b>Application Failed</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n` +
      `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>\n` +
      `<b>Error:</b> <pre>${escapeHtml(errorText)}</pre>`,
    parse_mode: 'HTML',
  };
}

export function createDailySummaryMessage(stats = {}) {
  const date = stats.date || new Date().toISOString().split('T')[0];
  const applied = Number(stats.applied ?? stats.success ?? 0);
  const pending = Number(stats.pending ?? stats.awaitingApproval ?? 0);
  const failed = Number(stats.failed ?? 0);
  const total = Number(stats.total ?? applied + pending + failed);
  const successRate = total > 0 ? Math.round((applied / total) * 100) : 0;

  return {
    payload: { ...stats, date, total, applied, pending, failed, successRate },
    message: {
      text:
        '📊 <b>Daily Application Summary</b>\n\n' +
        `<b>Date:</b> ${escapeHtml(date)}\n` +
        `<b>Total:</b> ${total}\n` +
        `<b>Applied:</b> ${applied}\n` +
        `<b>Pending Approval:</b> ${pending}\n` +
        `<b>Failed:</b> ${failed}\n` +
        `<b>Success Rate:</b> ${successRate}%`,
      parse_mode: 'HTML',
    },
  };
}

export function createCaptchaDetectedMessage(job, platform) {
  return {
    text:
      '🤖 <b>CAPTCHA Detected - Manual Intervention Required</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n\n` +
      'Please resolve CAPTCHA manually and resume automation.',
    parse_mode: 'HTML',
  };
}
