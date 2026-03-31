/**
 * Parallel Processing - Concurrent task execution utilities
 *
 * Provides worker pools, async queues, and concurrency-limited
 * parallel processing for job applications.
 */

import { EventEmitter } from 'events';

/**
 * @typedef {Object} TaskResult
 * @property {*} item
 * @property {*} result
 * @property {boolean} success
 * @property {Error} [error]
 * @property {number} duration
 */

/**
 * @typedef {Object} ParallelOptions
 * @property {number} [concurrency=2] - Max concurrent tasks
 * @property {boolean} [stopOnError=false] - Stop on first error
 * @property {number} [retryCount=0] - Retry attempts
 * @property {number} [retryDelay=1000] - Delay between retries
 * @property {Function} [onProgress] - Progress callback
 */

/**
 * Process items in parallel with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} processor - Async processor function
 * @param {ParallelOptions} options
 * @returns {Promise<TaskResult[]>}
 */
export async function processInParallel(items, processor, options = {}) {
  const {
    concurrency = 2,
    stopOnError = false,
    retryCount = 0,
    retryDelay = 1000,
    onProgress,
  } = options;

  const results = [];
  const queue = [...items];
  const inProgress = new Set();
  let completed = 0;
  let hasError = false;

  return new Promise((resolve, reject) => {
    function checkComplete() {
      if (hasError && stopOnError) {
        reject(new Error('Processing stopped due to error'));
        return;
      }

      if (completed === items.length) {
        resolve(results);
        return;
      }

      // Fill worker slots
      while (inProgress.size < concurrency && queue.length > 0 && !(hasError && stopOnError)) {
        const item = queue.shift();
        const index = completed + inProgress.size;
        processItem(item, index);
      }
    }

    async function processItem(item, index) {
      const startTime = Date.now();
      const promiseId = `${index}-${Date.now()}`;
      inProgress.add(promiseId);

      let attempts = 0;
      let lastError;

      while (attempts <= retryCount) {
        try {
          const result = await processor(item, index);

          const taskResult = {
            item,
            result,
            success: true,
            duration: Date.now() - startTime,
          };

          results[index] = taskResult;
          completed++;

          if (onProgress) {
            onProgress({
              completed,
              total: items.length,
              current: item,
              result: taskResult,
            });
          }

          break;
        } catch (error) {
          lastError = error;
          attempts++;

          if (attempts <= retryCount) {
            await sleep(retryDelay * attempts);
          }
        }
      }

      if (attempts > retryCount && lastError) {
        results[index] = {
          item,
          result: null,
          success: false,
          error: lastError,
          duration: Date.now() - startTime,
        };
        completed++;
        hasError = true;
      }

      inProgress.delete(promiseId);
      checkComplete();
    }

    // Start initial workers
    checkComplete();
  });
}

/**
 * Async Queue with concurrency control
 */
export class AsyncQueue extends EventEmitter {
  #queue = [];
  #running = 0;
  #concurrency;
  #processor;
  #results = [];
  #errors = [];
  #isProcessing = false;
  #isPaused = false;

  /**
   * @param {Function} processor - Async function to process items
   * @param {Object} options
   * @param {number} [options.concurrency=1]
   */
  constructor(processor, options = {}) {
    super();
    this.#processor = processor;
    this.#concurrency = options.concurrency || 1;
  }

  /**
   * Add item to queue
   * @param {*} item
   * @returns {Promise<*>}
   */
  add(item) {
    return new Promise((resolve, reject) => {
      this.#queue.push({
        item,
        resolve,
        reject,
        startTime: Date.now(),
      });

      this.emit('added', { item, queueLength: this.#queue.length });
      this.#process();
    });
  }

  /**
   * Add multiple items
   * @param {Array} items
   * @returns {Promise<Array>}
   */
  addAll(items) {
    return Promise.all(items.map((item) => this.add(item)));
  }

  /**
   * Pause processing
   */
  pause() {
    this.#isPaused = true;
    this.emit('paused');
  }

  /**
   * Resume processing
   */
  resume() {
    this.#isPaused = false;
    this.emit('resumed');
    this.#process();
  }

  /**
   * Clear queue
   * @param {boolean} [rejectPending=true]
   */
  clear(rejectPending = true) {
    if (rejectPending) {
      for (const { reject } of this.#queue) {
        reject(new Error('Queue cleared'));
      }
    }

    this.#queue = [];
    this.emit('cleared');
  }

  /**
   * Wait for all tasks to complete
   * @returns {Promise<void>}
   */
  async drain() {
    while (this.#running > 0 || this.#queue.length > 0) {
      await sleep(100);
    }
  }

  /**
   * Get queue stats
   * @returns {Object}
   */
  getStats() {
    return {
      queued: this.#queue.length,
      running: this.#running,
      completed: this.#results.length,
      errors: this.#errors.length,
    };
  }

  /**
   * Process next items
   */
  async #process() {
    if (this.#isProcessing || this.#isPaused) return;
    if (this.#queue.length === 0) return;
    if (this.#running >= this.#concurrency) return;

    this.#isProcessing = true;

    while (this.#queue.length > 0 && this.#running < this.#concurrency && !this.#isPaused) {
      const { item, resolve, reject } = this.#queue.shift();
      this.#running++;

      this.emit('started', { item, running: this.#running });

      try {
        const result = await this.#processor(item);
        this.#results.push({ item, result });
        resolve(result);
        this.emit('completed', { item, result });
      } catch (error) {
        this.#errors.push({ item, error });
        reject(error);
        this.emit('error', { item, error });
      } finally {
        this.#running--;
        this.emit('finished', { item, running: this.#running });
      }
    }

    this.#isProcessing = false;

    // Continue if more items
    if (this.#queue.length > 0 && !this.#isPaused) {
      this.#process();
    } else if (this.#running === 0 && this.#queue.length === 0) {
      this.emit('drained');
    }
  }
}

/**
 * Worker Pool for reusable workers
 */
export class WorkerPool extends EventEmitter {
  #workers = [];
  #available = [];
  #queue = [];
  #workerFactory;
  #maxWorkers;
  #isDestroyed = false;

  /**
   * @param {Function} workerFactory - Returns a worker instance
   * @param {Object} options
   * @param {number} [options.maxWorkers=4]
   */
  constructor(workerFactory, options = {}) {
    super();
    this.#workerFactory = workerFactory;
    this.#maxWorkers = options.maxWorkers || 4;
  }

  /**
   * Execute task on available worker
   * @param {*} task
   * @returns {Promise<*>}
   */
  async execute(task) {
    if (this.#isDestroyed) {
      throw new Error('Worker pool destroyed');
    }

    const worker = await this.#acquire();

    try {
      const result = await worker.process(task);
      this.#release(worker);
      return result;
    } catch (error) {
      this.#release(worker);
      throw error;
    }
  }

  /**
   * Execute multiple tasks
   * @param {Array} tasks
   * @returns {Promise<Array>}
   */
  async executeAll(tasks) {
    return Promise.all(tasks.map((task) => this.execute(task)));
  }

  /**
   * Get pool stats
   * @returns {Object}
   */
  getStats() {
    return {
      total: this.#workers.length,
      available: this.#available.length,
      busy: this.#workers.length - this.#available.length,
      queued: this.#queue.length,
    };
  }

  /**
   * Destroy all workers
   */
  async destroy() {
    this.#isDestroyed = true;

    // Reject pending
    while (this.#queue.length > 0) {
      const { reject } = this.#queue.shift();
      reject(new Error('Pool destroyed'));
    }

    // Destroy workers
    await Promise.all(
      this.#workers.map(async (worker) => {
        if (worker.destroy) {
          await worker.destroy();
        }
      })
    );

    this.#workers = [];
    this.#available = [];
  }

  /**
   * Acquire a worker
   * @returns {Promise<*>}
   */
  async #acquire() {
    // Return available worker
    if (this.#available.length > 0) {
      return this.#available.pop();
    }

    // Create new worker if under limit
    if (this.#workers.length < this.#maxWorkers) {
      const worker = await this.#workerFactory();
      this.#workers.push(worker);
      return worker;
    }

    // Wait for available worker
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.#queue.findIndex((item) => item.resolve === resolve);
        if (index > -1) {
          this.#queue.splice(index, 1);
        }
        reject(new Error('Worker acquisition timeout'));
      }, 30000);

      this.#queue.push({
        resolve: (worker) => {
          clearTimeout(timeout);
          resolve(worker);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  /**
   * Release worker back to pool
   * @param {*} worker
   */
  #release(worker) {
    // Check if anyone is waiting
    if (this.#queue.length > 0) {
      const { resolve } = this.#queue.shift();
      resolve(worker);
      return;
    }

    this.#available.push(worker);
  }
}

/**
 * Rate-limited batch processor
 * @param {Array} items
 * @param {Function} processor
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function batchProcess(items, processor, options = {}) {
  const { batchSize = 10, delayBetweenBatches = 1000, concurrency = 1, onBatchComplete } = options;

  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    const batchResults = await processInParallel(batch, processor, {
      concurrency,
    });

    results.push(...batchResults);

    if (onBatchComplete) {
      onBatchComplete({
        batchNumber,
        totalBatches,
        completed: results.length,
        total: items.length,
        results: batchResults,
      });
    }

    // Delay between batches (except last)
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}

/**
 * Sleep utility
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Apply to jobs in parallel with concurrency control
 * @param {Array} jobs
 * @param {Function} applyFn
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function applyToJobsParallel(jobs, applyFn, options = {}) {
  const { maxConcurrency = 2, delayBetweenApps = 3000 } = options;

  return processInParallel(
    jobs,
    async (job, index) => {
      // Add delay between applications (except first)
      if (index > 0) {
        await sleep(delayBetweenApps);
      }

      return applyFn(job);
    },
    {
      concurrency: maxConcurrency,
      stopOnError: false,
      onProgress: options.onProgress,
    }
  );
}

export default {
  processInParallel,
  AsyncQueue,
  WorkerPool,
  batchProcess,
  applyToJobsParallel,
};
