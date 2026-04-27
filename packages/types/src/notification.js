/**
 * @typedef {Object} NotificationJob
 * @property {string} id
 * @property {'telegram' | 'email' | 'slack'} type
 * @property {'critical' | 'high' | 'normal' | 'low'} priority
 * @property {Object} payload
 * @property {number} createdAt
 * @property {number} attempts
 * @property {number} maxAttempts
 */

export const NotificationPriority = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
});

export const NotificationType = Object.freeze({
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SLACK: 'slack',
});
