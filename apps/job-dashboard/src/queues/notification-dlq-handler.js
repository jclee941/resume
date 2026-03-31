/**
 * Notification Dead Letter Queue Handler
 * Wave 3: DLQ processing with retry logic for critical notifications
 */

import { NotificationService } from '../services/notifications.js';

const MAX_CRITICAL_RETRIES = 5;
const BACKOFF_BASE_SECONDS = 30;

/**
 * DLQ consumer for failed notifications
 * @param {MessageBatch<NotificationJob>} batch
 * @param {Env} env
 */
export default {
  async queue(batch, env) {
    const notificationService = new NotificationService(env);
    const results = {
      logged: 0,
      retried: 0,
      archived: 0,
    };

    for (const message of batch.messages) {
      const job = message.body;

      try {
        // Log failed notification for analysis
        await logFailedNotification(job, message.attempts, env);
        results.logged++;

        // Critical notifications get manual retry with backoff
        if (job.priority === 'critical' && message.attempts < MAX_CRITICAL_RETRIES) {
          const delaySeconds = calculateBackoff(message.attempts);

          // Re-queue with delay
          await env.NOTIFICATION_QUEUE.send(
            { ...job, attempts: message.attempts + 1 },
            { delaySeconds }
          );

          console.log('Critical notification re-queued:', {
            jobId: job.id,
            attempts: message.attempts + 1,
            delaySeconds,
            timestamp: new Date().toISOString(),
          });

          results.retried++;
        } else if (job.priority === 'critical') {
          // Max retries exceeded for critical - alert admin
          await alertAdmin(job, message.attempts, env, notificationService);
          results.archived++;
        } else {
          // Non-critical notifications are just logged
          results.archived++;
        }

        message.ack();
      } catch (error) {
        console.error('DLQ processing failed:', {
          jobId: job.id,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        // Don't retry DLQ processing - alert and move on
        await alertAdmin(job, message.attempts, env, notificationService);
        message.ack();
      }
    }

    console.log('DLQ batch processed:', {
      total: batch.messages.length,
      ...results,
      timestamp: new Date().toISOString(),
    });

    return results;
  },
};

/**
 * Calculate exponential backoff delay
 * @param {number} attempts
 * @returns {number} Delay in seconds
 */
function calculateBackoff(attempts) {
  // Exponential backoff: 30s, 60s, 120s, 240s, 480s (max 8 minutes)
  return Math.min(BACKOFF_BASE_SECONDS * Math.pow(2, attempts - 1), 480);
}

/**
 * Log failed notification to KV for analysis
 * @param {NotificationJob} job
 * @param {number} attempts
 * @param {Env} env
 */
async function logFailedNotification(job, attempts, env) {
  const logEntry = {
    jobId: job.id,
    type: job.type,
    priority: job.priority,
    payload: job.payload,
    attempts,
    timestamp: Date.now(),
    error: job.lastError || 'Unknown error',
  };

  // Store in KV with TTL (30 days)
  const key = `failed_notification:${job.id}`;
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(logEntry), {
    expirationTtl: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Alert admin about critical notification failure
 * @param {NotificationJob} job
 * @param {number} attempts
 * @param {Env} env
 * @param {NotificationService} service
 */
async function alertAdmin(job, attempts, env, service) {
  const message = `
🚨 <b>Critical Notification Failed</b>

<b>Job ID:</b> ${job.id}
<b>Type:</b> ${job.type}
<b>Priority:</b> ${job.priority}
<b>Attempts:</b> ${attempts}/${MAX_CRITICAL_RETRIES}
<b>Time:</b> ${new Date().toISOString()}

Manual intervention required.
  `.trim();

  try {
    await service.sendTelegramNotification({
      text: message,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Failed to send admin alert:', error.message);
  }
}
