/**
 * Notification Queue Consumer
 * Wave 2: Batch processing with priority handling
 */

import { NotificationService } from '../services/notifications.js';

/**
 * @typedef {{
 *   job: Record<string, unknown>;
 *   matchScore: number;
 *   requestId: string;
 *   [key: string]: unknown;
 * }} ApprovalNotificationPayload
 *
 * @typedef {{
 *   id: string;
 *   type: 'telegram' | 'email' | 'slack' | 'approval' | string;
 *   priority: string;
 *   payload: ApprovalNotificationPayload & Record<string, unknown>;
 *   createdAt?: number;
 *   attempts?: number;
 *   maxAttempts?: number;
 * }} ConsumerNotificationJob
 *
 * @typedef {{
 *   id?: string;
 *   body: ConsumerNotificationJob;
 *   attempts: number;
 *   ack(): void;
 *   retry(options?: { delaySeconds: number }): void;
 * }} QueueMessage
 *
 * @typedef {{
 *   queue?: string;
 *   messages: QueueMessage[];
 * }} ConsumerQueueBatch
 *
 * @typedef {{
 *   sent: boolean;
 *   waitTime?: number;
 *   results?: Record<string, { sent?: boolean; waitTime?: number }>;
 * }} DeliveryResult
 */

/** @type {Record<string, number>} */
const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export default {
  /**
   * Queue consumer handler for notification batch processing
   * @param {ConsumerQueueBatch} batch
   * @param {import('../services/notifications.js').NotificationEnv} env
   * @param {unknown} [_ctx]
   */
  async queue(batch, env, _ctx) {
    const notificationService = new NotificationService(env);
    const results = {
      processed: 0,
      failed: 0,
      retries: 0,
    };

    // Sort messages by priority (critical first)
    const sortedMessages = batch.messages.sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a.body.priority] ?? PRIORITY_ORDER.normal;
      const priorityB = PRIORITY_ORDER[b.body.priority] ?? PRIORITY_ORDER.normal;
      return priorityA - priorityB;
    });

    // Group by type for batch optimization
    const groupedByType = sortedMessages.reduce((acc, msg) => {
      const type = msg.body.type || 'telegram';
      if (!acc[type]) acc[type] = [];
      acc[type].push(msg);
      return acc;
    }, /** @type {Record<string, QueueMessage[]>} */ ({}));

    // Process each type group
    for (const [, messages] of Object.entries(groupedByType)) {
      for (const message of messages) {
        try {
          const delivery = await processNotification(message.body, notificationService);
          if (!delivery.sent) {
            const waitTime = Math.max(
              0,
              ...[delivery, ...Object.values(delivery.results || {})]
                .filter((result) => result.sent === false)
                .map((result) => result.waitTime || 0)
            );
            if (waitTime > 0) {
              message.retry({ delaySeconds: Math.ceil(waitTime / 1000) });
            } else {
              message.retry();
            }
            results.failed++;
            results.retries++;
            continue;
          }
          message.ack();
          results.processed++;
        } catch (error) {
          console.error('Notification processing failed:', {
            jobId: message.body.id,
            error: error instanceof Error ? error.message : String(error),
            attempts: message.body.attempts,
          });

          // Retry logic handled by queue configuration
          // DLQ will receive after max_retries
          message.retry();
          results.failed++;
          results.retries++;
        }
      }
    }

    // Log batch processing results
    console.log('Notification batch processed:', {
      total: batch.messages.length,
      ...results,
      timestamp: new Date().toISOString(),
    });

    return results;
  },
};

/**
 * Process a single notification
 * @param {ConsumerNotificationJob} job
 * @param {NotificationService} service
 * @returns {Promise<DeliveryResult>}
 */
async function processNotification(job, service) {
  switch (job.type) {
    case 'telegram': {
      const isPublicPosting =
        typeof job.payload.postingId === 'string' &&
        job.id === `public-job:${job.payload.postingId}`;
      if (isPublicPosting) {
        const receipt = await service.env.JOB_DB.prepare(
          'SELECT status FROM notification_history WHERE id = ?'
        )
          .bind(job.id)
          .first();
        if (receipt?.status === 'success') return { sent: true };
      }
      const delivery = await service.sendTelegramNotification(job.payload);
      if (isPublicPosting) {
        await service.env.JOB_DB.prepare(
          `INSERT INTO notification_history (
            id, event_type, data, channels, timestamp, status, results
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            timestamp = excluded.timestamp,
            status = excluded.status,
            results = excluded.results
          WHERE notification_history.status != 'success'`
        )
          .bind(
            job.id,
            'public_job',
            JSON.stringify({ postingId: job.payload.postingId }),
            JSON.stringify(['telegram']),
            new Date().toISOString(),
            delivery.sent ? 'success' : 'failed',
            JSON.stringify({ telegram: delivery })
          )
          .run();
      }
      return delivery;
    }
    case 'approval':
      return /** @type {DeliveryResult} */ (
        await service.sendApprovalRequest(
          job.payload.job,
          job.payload.matchScore,
          job.payload.requestId
        )
      );
    default:
      throw new Error(`Unknown notification type: ${job.type}`);
  }
}
