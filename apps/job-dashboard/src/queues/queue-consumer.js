import { QueueMessageProcessor } from './queue-message-processor.js';
import { QueueMetricsRecorder } from './queue-metrics-recorder.js';
import { sortMessagesByPriority } from './queue-message-sorter.js';
import { QueueWorkflowDispatcher } from './queue-workflow-dispatcher.js';
import notificationConsumer from './notification-consumer.js';
import { QUEUE_NAME } from './queue-request.js';

/** Queue names bound as consumers in wrangler.jsonc. */
export const NOTIFICATIONS_QUEUE_NAME = 'notifications';

/** @typedef {import('@resume/types').QueueStats} QueueStats */

/**
 * @typedef {{
 *   info(message: string, meta?: Record<string, unknown>): void;
 *   warn(message: string, meta?: Record<string, unknown>): void;
 *   error(message: string, error?: unknown): void;
 * }} QueueLogger
 *
 * @typedef {{
 *   queue: string;
 *   messages: readonly import('./queue-message-processor.js').QueueMessageItem[];
 * }} QueueBatch
 *
 * @typedef {{
 *   waitUntil(promise: Promise<unknown>): void;
 * }} QueueExecutionContext
 */

/**
 * @typedef {import('./queue-message-processor.js').QueueMessageItem
 *   & import('./notification-consumer.js').QueueMessage} NotificationQueueMessage
 */

/**
 * Structural check that a message carries the notification job shape.
 *
 * @param {import('./queue-message-processor.js').QueueMessageItem} msg
 * @returns {msg is NotificationQueueMessage}
 */
function isNotificationMessage(msg) {
  const body = msg.body;
  return (
    typeof body?.type === 'string' &&
    typeof body.priority === 'string' &&
    typeof body.payload === 'object' &&
    body.payload !== null
  );
}

/**
 * Route a batch to the consumer owning its queue; unknown queues fail visibly.
 * Malformed notification messages are retried, never acknowledged.
 *
 * @param {QueueBatch} batch
 * @param {ConstructorParameters<typeof QueueConsumer>[0]
 *   & import('../services/notifications.js').NotificationEnv} env
 * @param {QueueExecutionContext} ctx
 * @param {QueueLogger} logger
 */
export async function routeQueueBatch(batch, env, ctx, logger) {
  if (batch.queue === NOTIFICATIONS_QUEUE_NAME) {
    const valid = batch.messages.filter(isNotificationMessage);
    for (const msg of batch.messages) {
      if (!isNotificationMessage(msg)) {
        logger.warn('Malformed notification message, retrying', { messageId: msg.id });
        msg.retry();
      }
    }
    await notificationConsumer.queue({ queue: batch.queue, messages: valid }, env, ctx);
    return;
  }
  if (batch.queue === QUEUE_NAME) {
    await new QueueConsumer(env, logger).processBatch(batch, ctx);
    return;
  }
  logger.error('Unexpected queue', new Error(`Unexpected queue: ${batch.queue}`));
  throw new Error(`Unexpected queue: ${batch.queue}`);
}

/**
 * Cloudflare Queue consumer for job automation tasks.
 * Processes batches of messages with priority sorting, per-message error handling,
 * and workflow dispatching.
 */
export class QueueConsumer {
  /**
   * @param {import('./queue-workflow-dispatcher.js').DispatcherEnv & { JOB_DB?: import('./queue-metrics-recorder.js').D1Database }} env - Cloudflare Worker environment bindings
   * @param {QueueLogger} logger - Logger instance
   */
  constructor(env, logger) {
    this.logger = logger;
    /** @type {QueueStats} */
    this.stats = { processed: 0, succeeded: 0, failed: 0, retried: 0 };

    const dispatcher = new QueueWorkflowDispatcher(env, logger);
    this.processor = new QueueMessageProcessor(
      logger,
      /** @type {import('./queue-message-processor.js').MessageDispatcher} */ (dispatcher),
      this.stats
    );
    this.metrics = new QueueMetricsRecorder(env, logger, this.stats);
  }

  /**
   * Process a batch of queue messages.
   * Messages are sorted by priority (urgent first), then processed sequentially.
   *
   * @param {QueueBatch} batch
   * @param {QueueExecutionContext} ctx
   */
  async processBatch(batch, ctx) {
    const startTime = Date.now();
    this.logger.info('Processing queue batch', {
      queue: batch.queue,
      count: batch.messages.length,
    });

    for (const msg of sortMessagesByPriority(batch.messages)) {
      await this.processor.process(msg);
    }

    const duration = Date.now() - startTime;
    this.logger.info('Batch processing complete', {
      queue: batch.queue,
      duration,
      ...this.stats,
    });

    ctx.waitUntil(this.metrics.record(batch.queue, duration));
  }
}
