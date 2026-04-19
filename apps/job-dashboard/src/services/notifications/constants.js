export const TELEGRAM_MAX_LENGTH = 4096;
export const N8N_TIMEOUT_MS = 10000;
export const TELEGRAM_TIMEOUT_MS = 10000;
export const MAX_RETRIES = 3;
export const RETRY_DELAYS = [1000, 2000, 4000];

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

export const NotificationChannel = {
  TELEGRAM: 'telegram',
  N8N: 'n8n',
  BOTH: 'both',
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  approval_required: { channels: [NotificationChannel.BOTH], enabled: true },
  application_success: { channels: [NotificationChannel.BOTH], enabled: true },
  application_failed: { channels: [NotificationChannel.BOTH], enabled: true },
  daily_summary: { channels: [NotificationChannel.TELEGRAM], enabled: true },
  captcha_detected: { channels: [NotificationChannel.BOTH], enabled: true },
  job_started: { channels: [NotificationChannel.N8N], enabled: false },
  job_completed: { channels: [NotificationChannel.N8N], enabled: false },
  resume_sync: { channels: [NotificationChannel.BOTH], enabled: true },
};

export function createDefaultNotificationPreferences() {
  return Object.fromEntries(
    Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([eventType, preference]) => [
      eventType,
      {
        ...preference,
        channels: [...preference.channels],
      },
    ])
  );
}
