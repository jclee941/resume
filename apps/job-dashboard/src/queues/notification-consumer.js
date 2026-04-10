/**
 * Notification Queue Consumer
 * Wave 2: Batch processing with priority handling
 */

import { NotificationService } from '../services/notifications.js';

const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Queue consumer handler for notification batch processing
 * @param {MessageBatch<NotificationJob>} batch
 * @param {Env} env
 * @param {ExecutionContext} ctx
 */
export default {
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
    }, {});

    // Process each type group
    for (const [, messages] of Object.entries(groupedByType)) {
      for (const message of messages) {
        try {
          await processNotification(message.body, notificationService);
          message.ack();
          results.processed++;
        } catch (error) {
          console.error('Notification processing failed:', {
            jobId: message.body.id,
            error: error.message,
            attempts: message.body.attempts,
          });

          // Retry logic handled by queue configuration
          // DLQ will receive after max_retries
          message.retry();
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
 * @param {NotificationJob} job
 * @param {NotificationService} service
 */
async function processNotification(job, service) {
  switch (job.type) {
    case 'telegram':
      await service.sendTelegramNotification(job.payload);
      break;
    case 'approval':
      await service.sendApprovalRequest(
        job.payload.job,
        job.payload.matchScore,
        job.payload.requestId
      );
      break;
    default:
      throw new Error(`Unknown notification type: ${job.type}`);
  }
}
