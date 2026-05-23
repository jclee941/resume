import { QueueConsumer } from './queues/queue-consumer.js';
import { enqueueBatch, enqueueTask } from './queues/queue-enqueuer.js';
import { MESSAGE_TYPES, PRIORITY } from './queues/queue-message-constants.js';

/** @typedef {import('@resume/types').QueueMessage} QueueMessage */
/** @typedef {import('@resume/types').QueueStats} QueueStats */

export { QueueConsumer, enqueueBatch, enqueueTask, MESSAGE_TYPES, PRIORITY };
