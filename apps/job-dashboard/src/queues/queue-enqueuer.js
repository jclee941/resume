import { PRIORITY } from './queue-message-constants.js';

/** @typedef {import('@resume/types').QueueMessage} QueueMessage */

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
