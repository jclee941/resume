import { QueueMessageProcessor } from './queue-message-processor.js';
import { QueueMetricsRecorder } from './queue-metrics-recorder.js';
import { sortMessagesByPriority } from './queue-message-sorter.js';
import { QueueWorkflowDispatcher } from './queue-workflow-dispatcher.js';

/** @typedef {import('@resume/types').QueueStats} QueueStats */

/**
 * Cloudflare Queue consumer for job automation tasks.
 * Processes batches of messages with priority sorting, per-message error handling,
 * and workflow dispatching.
 */
export class QueueConsumer {
  /**
   * @param {Object} env - Cloudflare Worker environment bindings
   * @param {Object} logger - Logger instance
   */
  constructor(env, logger) {
    this.logger = logger;
    /** @type {QueueStats} */
    this.stats = { processed: 0, succeeded: 0, failed: 0, retried: 0 };

    const dispatcher = new QueueWorkflowDispatcher(env, logger);
    this.processor = new QueueMessageProcessor(logger, dispatcher, this.stats);
    this.metrics = new QueueMetricsRecorder(env, logger, this.stats);
  }

  /**
   * Process a batch of queue messages.
   * Messages are sorted by priority (urgent first), then processed sequentially.
   *
   * @param {import('@cloudflare/workers-types').MessageBatch} batch
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
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
