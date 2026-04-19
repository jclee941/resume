import { NotificationChannel, NotificationEvent } from './constants.js';
import { sendTelegramNotification, triggerN8nWebhook } from './delivery.js';
import { determineStatus, escapeHtml, sanitizeData } from './formatters.js';
import { saveNotificationHistory } from './history-preferences.js';

const PLATFORM_NAMES = {
  wanted: '원티드',
  jobkorea: '잡코리아',
  saramin: '사람인',
  remember: '리멤버',
};

export async function notify(service, eventType, data, options = {}) {
  if (!service.isEnabled(eventType)) {
    return { sent: false, reason: 'disabled' };
  }

  const channels = options.channels || service.getChannels(eventType);
  const results = {};
  const historyRecord = {
    id: crypto.randomUUID(),
    eventType,
    data: sanitizeData(data),
    channels,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  if (
    channels.includes(NotificationChannel.TELEGRAM) ||
    channels.includes(NotificationChannel.BOTH)
  ) {
    results.telegram = await sendTelegramNotification(service, data, options.telegram);
  }

  if (channels.includes(NotificationChannel.N8N) || channels.includes(NotificationChannel.BOTH)) {
    results.n8n = await triggerN8nWebhook(service, eventType, data);
  }

  historyRecord.status = determineStatus(results);
  historyRecord.results = results;

  saveNotificationHistory(service, historyRecord).catch((error) => {
    console.error('[NotificationService] Failed to save history:', error.message);
  });

  return {
    sent: historyRecord.status === 'success' || historyRecord.status === 'partial',
    historyId: historyRecord.id,
    results,
    status: historyRecord.status,
  };
}

export async function sendApprovalRequest(service, job, matchScore, applicationId) {
  const message = {
    text:
      '🔔 <b>Job Application Approval Request</b>\n\n' +
      `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
      `<b>Company:</b> ${escapeHtml(job.company)}\n` +
      `<b>Platform:</b> ${escapeHtml(job.platform || job.source)}\n` +
      `<b>Match Score:</b> ${matchScore}/100\n\n` +
      '<b>Actions:</b> Click buttons below to approve or reject',
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

  return notify(
    service,
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

export async function sendApplicationSuccess(service, job, applicationId, platform) {
  const data = {
    job,
    applicationId,
    platform,
    timestamp: new Date().toISOString(),
  };

  const telegramMessage = {
    text:
      '✅ <b>Application Submitted Successfully</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(job.company)}\n` +
      `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
      `<b>Platform:</b> ${escapeHtml(platform)}\n` +
      `<b>Application ID:</b> <code>${applicationId}</code>`,
    parse_mode: 'HTML',
  };

  return notify(service, NotificationEvent.APPLICATION_SUCCESS, data, {
    telegram: telegramMessage,
  });
}

export async function sendApplicationFailed(service, job, applicationId, error, platform) {
  const data = {
    job,
    applicationId,
    error: error?.message || String(error),
    platform,
    timestamp: new Date().toISOString(),
  };

  const telegramMessage = {
    text:
      '❌ <b>Application Failed</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(job.company)}\n` +
      `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
      `<b>Platform:</b> ${escapeHtml(platform)}\n` +
      `<b>Error:</b> <pre>${escapeHtml(data.error)}</pre>`,
    parse_mode: 'HTML',
  };

  return notify(service, NotificationEvent.APPLICATION_FAILED, data, {
    telegram: telegramMessage,
  });
}

export async function sendDailySummary(service, stats) {
  const data = {
    ...stats,
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
  };

  const telegramMessage = {
    text:
      '📊 <b>Daily Application Summary</b>\n\n' +
      `<b>Date:</b> ${data.date}\n` +
      `<b>Total Applied:</b> ${stats.applied || 0}\n` +
      `<b>Pending Approval:</b> ${stats.pending || 0}\n` +
      `<b>Failed:</b> ${stats.failed || 0}\n` +
      `<b>Success Rate:</b> ${stats.successRate || 0}%`,
    parse_mode: 'HTML',
  };

  return notify(service, NotificationEvent.DAILY_SUMMARY, data, {
    telegram: telegramMessage,
    channels: [NotificationChannel.TELEGRAM],
  });
}

export async function sendCaptchaDetected(service, job, platform) {
  const data = {
    job,
    platform,
    timestamp: new Date().toISOString(),
  };

  const telegramMessage = {
    text:
      '🤖 <b>CAPTCHA Detected - Manual Intervention Required</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(job.company)}\n` +
      `<b>Position:</b> ${escapeHtml(job.position || job.title)}\n` +
      `<b>Platform:</b> ${escapeHtml(platform)}\n\n` +
      'Please check the platform manually to continue.',
    parse_mode: 'HTML',
  };

  return notify(service, NotificationEvent.CAPTCHA_DETECTED, data, {
    telegram: telegramMessage,
  });
}

export async function sendResumeSync(service, platform, resumeId, success = true) {
  const data = {
    platform,
    platformName: PLATFORM_NAMES[platform] || platform,
    resumeId,
    success,
    timestamp: new Date().toISOString(),
  };

  const icon = success ? '✅' : '❌';
  const status = success ? 'completed' : 'failed';

  const telegramMessage = {
    text:
      `${icon} <b>Resume Sync ${status.toUpperCase()}</b>\n\n` +
      `<b>Platform:</b> ${PLATFORM_NAMES[platform] || platform}\n` +
      `<b>Resume ID:</b> <code>${resumeId}</code>`,
    parse_mode: 'HTML',
  };

  return notify(service, NotificationEvent.RESUME_SYNC, data, {
    telegram: telegramMessage,
  });
}
