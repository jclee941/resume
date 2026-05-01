import { normalizeError } from '@resume/shared/errors';
import { PRIORITY, RETRY_DELAYS } from './queue-message-constants.js';

export class QueueMessageProcessor {
  constructor(logger, dispatcher, stats) {
    this.logger = logger;
    this.dispatcher = dispatcher;
    this.stats = stats;
  }

  /**
   * Process a single queue message with error handling and retry logic.
   *
   * @param {import('@cloudflare/workers-types').Message} msg
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
