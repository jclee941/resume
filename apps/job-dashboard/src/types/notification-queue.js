/**
 * @typedef {Object} NotificationJob
 * @property {string} id - Unique job ID
 * @property {'telegram' | 'email' | 'slack'} type - Notification type
 * @property {'critical' | 'high' | 'normal' | 'low'} priority - Job priority
 * @property {Object} payload - Notification payload
 * @property {number} createdAt - Timestamp
 * @property {number} attempts - Retry attempts
 * @property {number} maxAttempts - Maximum retry attempts
 */

export const NotificationPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
};

export const NotificationType = {
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SLACK: 'slack',
};
