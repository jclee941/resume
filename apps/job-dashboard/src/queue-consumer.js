import { QueueConsumer } from './queues/queue-consumer.js';
import { enqueueBatch, enqueueTask } from './queues/queue-enqueuer.js';
import { MESSAGE_TYPES, PRIORITY } from './queues/queue-message-constants.js';

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

export { QueueConsumer, enqueueBatch, enqueueTask, MESSAGE_TYPES, PRIORITY };
