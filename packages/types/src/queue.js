/**
 * @typedef {Object} QueueMessage
 * @property {string} type - Message type: 'crawl' | 'apply' | 'sync' | 'report' | 'cleanup'
 * @property {string} [priority] - 'urgent' | 'background' (default: 'background')
 * @property {Object} payload - Type-specific payload data
 * @property {string} [correlationId] - Optional ID for tracking related messages
 * @property {number} [createdAt] - Unix timestamp of message creation
 */

/**
 * @typedef {Object} QueueStats
 * @property {number} processed - Total messages processed
 * @property {number} succeeded - Successfully processed messages
 * @property {number} failed - Failed messages (retried or sent to DLQ)
 * @property {number} retried - Messages explicitly retried
 */

/**
 * @typedef {'urgent'|'normal'|'low'} JobPriority
 */

/**
 * @typedef {Object} QueueJob
 * @property {string} id
 * @property {unknown} payload
 * @property {JobPriority} priority
 * @property {number} attempts
 * @property {number} createdAt
 * @property {number} availableAt
 * @property {string} [source]
 */

export const JOB_PRIORITY_ORDER = Object.freeze({
  urgent: 0,
  normal: 1,
  low: 2,
});

export const DEFAULT_QUEUE_RETRY = Object.freeze({
  maxAttempts: 5,
  baseDelayMs: 250,
  maxDelayMs: 30000,
  jitter: true,
});
