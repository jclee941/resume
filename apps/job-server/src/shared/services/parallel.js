/**
 * Parallel Processing - Concurrent task execution utilities
 *
 * Provides worker pools, async queues, and concurrency-limited
 * parallel processing for job applications.
 */

export { processInParallel } from './parallel/process-in-parallel.js';
export { AsyncQueue } from './parallel/async-queue.js';
export { WorkerPool } from './parallel/worker-pool.js';
export { batchProcess } from './parallel/batch-process.js';
export { applyToJobsParallel } from './parallel/apply-to-jobs.js';

import { processInParallel } from './parallel/process-in-parallel.js';
import { AsyncQueue } from './parallel/async-queue.js';
import { WorkerPool } from './parallel/worker-pool.js';
import { batchProcess } from './parallel/batch-process.js';
import { applyToJobsParallel } from './parallel/apply-to-jobs.js';

export default {
  processInParallel,
  AsyncQueue,
  WorkerPool,
  batchProcess,
  applyToJobsParallel,
};
