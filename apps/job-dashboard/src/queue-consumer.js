import { normalizeError } from '../../src/shared/errors/index.js';

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

const MESSAGE_TYPES = {
  CRAWL: 'crawl',
  APPLY: 'apply',
  SYNC: 'sync',
  REPORT: 'report',
  CLEANUP: 'cleanup',
};

const PRIORITY = {
  URGENT: 'urgent',
  BACKGROUND: 'background',
};

const RETRY_DELAYS = [10, 30, 60, 120, 300];

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
    this.env = env;
    this.logger = logger;
    /** @type {QueueStats} */
    this.stats = { processed: 0, succeeded: 0, failed: 0, retried: 0 };
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

    // Sort messages: urgent first, then by timestamp
    const sorted = [...batch.messages].sort((a, b) => {
      const priorityA = a.body?.priority === PRIORITY.URGENT ? 0 : 1;
      const priorityB = b.body?.priority === PRIORITY.URGENT ? 0 : 1;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.body?.createdAt || 0) - (b.body?.createdAt || 0);
    });

    for (const msg of sorted) {
      await this._processMessage(msg, ctx);
    }

    const duration = Date.now() - startTime;
    this.logger.info('Batch processing complete', {
      queue: batch.queue,
      duration,
      ...this.stats,
    });

    // Record batch metrics in D1
    ctx.waitUntil(this._recordMetrics(batch.queue, duration));
  }

  /**
   * Process a single queue message with error handling and retry logic.
   *
   * @param {import('@cloudflare/workers-types').Message} msg
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   * @private
   */
  async _processMessage(msg, ctx) {
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

      await this._dispatch(type, payload, msg, ctx);
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

  /**
   * Dispatch message to the appropriate workflow or handler.
   *
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @param {import('@cloudflare/workers-types').Message} msg - Original message
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   * @private
   */
  async _dispatch(type, payload, msg, ctx) {
    switch (type) {
      case MESSAGE_TYPES.CRAWL:
        return this._handleCrawl(payload, ctx);
      case MESSAGE_TYPES.APPLY:
        return this._handleApply(payload, ctx);
      case MESSAGE_TYPES.SYNC:
        return this._handleSync(payload, ctx);
      case MESSAGE_TYPES.REPORT:
        return this._handleReport(payload, ctx);
      case MESSAGE_TYPES.CLEANUP:
        return this._handleCleanup(payload, ctx);
      default:
        this.logger.warn('Unknown message type, acknowledging to prevent DLQ', { type });
        // Don't throw — unknown types should be discarded, not retried
        return;
    }
  }

  /**
   * Handle crawl task — dispatches to JobCrawlingWorkflow.
   * @param {Object} payload
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   * @private
   */
  async _handleCrawl(payload, _ctx) {
    const instance = await this.env.JOB_CRAWLING_WORKFLOW.create({
      params: {
        platforms: payload.platforms || ['wanted'],
        keywords: payload.keywords || [],
        filters: payload.filters || {},
        dryRun: payload.dryRun ?? false,
        source: 'queue',
      },
    });

    this.logger.info('Crawl workflow started', {
      instanceId: instance.id,
      platforms: payload.platforms,
    });
  }

  /**
   * Handle apply task — dispatches to ApplicationWorkflow.
   * @param {Object} payload
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   * @private
   */
  async _handleApply(payload, _ctx) {
    const instance = await this.env.APPLICATION_WORKFLOW.create({
      params: {
        jobId: payload.jobId,
        platform: payload.platform,
        resumeId: payload.resumeId,
        autoSubmit: payload.autoSubmit ?? false,
        source: 'queue',
      },
    });

    this.logger.info('Application workflow started', {
      instanceId: instance.id,
      jobId: payload.jobId,
      platform: payload.platform,
    });
  }

  /**
   * Handle sync task — dispatches to ResumeSyncWorkflow.
   * @param {Object} payload
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   * @private
   */
  async _handleSync(payload, _ctx) {
    const instance = await this.env.RESUME_SYNC_WORKFLOW.create({
      params: {
        sections: payload.sections || ['all'],
        dryRun: payload.dryRun ?? false,
        source: 'queue',
      },
    });

    this.logger.info('Sync workflow started', {
      instanceId: instance.id,
      sections: payload.sections,
    });
  }

  /**
   * Handle report task — dispatches to DailyReportWorkflow.
   * @param {Object} payload
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   * @private
   */
  async _handleReport(payload, _ctx) {
    const instance = await this.env.DAILY_REPORT_WORKFLOW.create({
      params: {
        type: payload.reportType || 'daily',
        recipients: payload.recipients || [],
        source: 'queue',
      },
    });

    this.logger.info('Report workflow started', {
      instanceId: instance.id,
      reportType: payload.reportType,
    });
  }

  /**
   * Handle cleanup task — dispatches to CleanupWorkflow.
   * @param {Object} payload
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   * @private
   */
  async _handleCleanup(payload, _ctx) {
    const instance = await this.env.CLEANUP_WORKFLOW.create({
      params: {
        retentionDays: payload.retentionDays || 30,
        targets: payload.targets || ['applications', 'logs', 'cache'],
        source: 'queue',
      },
    });

    this.logger.info('Cleanup workflow started', {
      instanceId: instance.id,
      targets: payload.targets,
    });
  }

  /**
   * Record batch processing metrics in D1 for monitoring.
   * @param {string} queueName
   * @param {number} duration - Processing time in ms
   * @private
   */
  async _recordMetrics(queueName, duration) {
    try {
      if (!this.env.DB) return;

      await this.env.DB.prepare(
        `INSERT INTO sync_logs (id, sync_type, status, started_at, completed_at, details)
         VALUES (?, ?, ?, datetime('now', ?), datetime('now'), ?)`
      )
        .bind(
          crypto.randomUUID(),
          'queue_batch',
          this.stats.failed > 0 ? 'partial' : 'success',
          `-${Math.round(duration / 1000)} seconds`,
          JSON.stringify({
            queue: queueName,
            duration,
            ...this.stats,
          })
        )
        .run();
    } catch (err) {
      this.logger.warn('Failed to record queue metrics', { error: err.message });
    }
  }
}

/**
 * Enqueue a message to the crawl-tasks queue.
 *
 * @param {Object} env - Worker environment with CRAWL_TASKS binding
 * @param {QueueMessage} message - Message to enqueue
 * @param {Object} [options] - Send options
 * @param {number} [options.delaySeconds] - Delay before message becomes visible (0-43200)
 * @returns {Promise<void>}
 */
export async function enqueueTask(env, message, options = {}) {
  const enriched = {
    ...message,
    createdAt: message.createdAt || Date.now(),
    priority: message.priority || PRIORITY.BACKGROUND,
  };

  await env.CRAWL_TASKS.send(enriched, {
    delaySeconds: options.delaySeconds || 0,
  });
}

/**
 * Enqueue multiple messages as a batch.
 *
 * @param {Object} env - Worker environment with CRAWL_TASKS binding
 * @param {QueueMessage[]} messages - Messages to enqueue
 * @returns {Promise<void>}
 */
export async function enqueueBatch(env, messages) {
  const enriched = messages.map((msg) => ({
    body: {
      ...msg,
      createdAt: msg.createdAt || Date.now(),
      priority: msg.priority || PRIORITY.BACKGROUND,
    },
  }));

  await env.CRAWL_TASKS.sendBatch(enriched);
}

export { MESSAGE_TYPES, PRIORITY };
