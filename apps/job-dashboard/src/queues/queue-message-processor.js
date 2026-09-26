import { normalizeError } from '@resume/shared/errors';
import { PRIORITY, RETRY_DELAYS } from './queue-message-constants.js';

/**
 * @typedef {Object} ProcessorLogger
 * @property {(msg: string, meta?: Record<string, unknown>) => void} info
 * @property {(msg: string, meta?: Record<string, unknown>) => void} warn
 * @property {(msg: string, error?: unknown) => void} error
 */

/**
 * @typedef {Object} MessageDispatcher
 * @property {(type: string, payload: unknown) => Promise<unknown>} dispatch
 */

/**
 * @typedef {Object} QueueStatsTracker
 * @property {number} processed
 * @property {number} failed
 * @property {number} succeeded
 * @property {number} retried
 */

/**
 * @typedef {Object} QueueMessageBody
 * @property {string} [type]
 * @property {unknown} [payload]
 * @property {string} [priority]
 * @property {string} [correlationId]
 */

/**
 * @typedef {Object} QueueMessageItem
 * @property {string} id
 * @property {number} attempts
 * @property {QueueMessageBody} [body]
 * @property {() => void} ack
 * @property {(options?: { delaySeconds?: number }) => void} retry
 */

export class QueueMessageProcessor {
  /**
   * @param {ProcessorLogger} logger
   * @param {MessageDispatcher} dispatcher
   * @param {QueueStatsTracker} stats
   */
  constructor(logger, dispatcher, stats) {
    this.logger = logger;
    this.dispatcher = dispatcher;
    this.stats = stats;
  }

  /**
   * Process a single queue message with error handling and retry logic.
   *
   * @param {QueueMessageItem} msg
   */
  async process(msg) {
    this.stats.processed++;
    const { type, payload, priority, correlationId } = msg.body || {};

    this.logger.info('Processing message', {
      messageId: msg.id,
      type,
      priority: priority || PRIORITY.BACKGROUND,
      attempt: msg.attempts,
      correlationId,
    });

    try {
      if (!type || !payload) {
        this.logger.warn('Invalid message format, acknowledging to prevent retry', {
          messageId: msg.id,
        });
        msg.ack();
        this.stats.failed++;
        return;
      }

      await this.dispatcher.dispatch(type, payload);
      msg.ack();
      this.stats.succeeded++;

      this.logger.info('Message processed successfully', {
        messageId: msg.id,
        type,
        correlationId,
      });
    } catch (err) {
      const error = normalizeError(err, { messageId: msg.id, type, attempt: msg.attempts });
      this.logger.error('Message processing failed', error);

      const retryDelay = RETRY_DELAYS[Math.min(msg.attempts - 1, RETRY_DELAYS.length - 1)];
      msg.retry({ delaySeconds: retryDelay });
      this.stats.retried++;
      this.stats.failed++;

      this.logger.info('Message scheduled for retry', {
        messageId: msg.id,
        attempt: msg.attempts,
        delaySeconds: retryDelay,
      });
    }
  }
}
