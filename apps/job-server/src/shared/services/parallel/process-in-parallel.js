import { sleep } from './shared.js';

/**
 * @template T
 * @template R
 * @typedef {{
 *   item: T;
 *   result: R | null;
 *   success: boolean;
 *   duration: number;
 *   error?: unknown;
 * }} ParallelTaskResult
 */

/**
 * @template T
 * @template R
 * @typedef {{
 *   concurrency?: number;
 *   stopOnError?: boolean;
 *   retryCount?: number;
 *   retryDelay?: number;
 *   onProgress?: (info: { completed: number; total: number; current: T; result: ParallelTaskResult<T, R> }) => void;
 * }} ProcessInParallelOptions
 */

/**
 * Process items in parallel with concurrency limit
 * @template T
 * @template R
 * @param {T[]} items - Items to process
 * @param {(item: T, index: number) => Promise<R> | R} processor - Async processor function
 * @param {ProcessInParallelOptions<T, R>} [options]
 * @returns {Promise<ParallelTaskResult<T, R>[]>}
 */
export async function processInParallel(items, processor, options = {}) {
  const {
    concurrency = 2,
    stopOnError = false,
    retryCount = 0,
    retryDelay = 1000,
    onProgress,
  } = options;

  /** @type {ParallelTaskResult<T, R>[]} */
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

      while (inProgress.size < concurrency && queue.length > 0 && !(hasError && stopOnError)) {
        const item = queue.shift();
        const index = completed + inProgress.size;
        processItem(/** @type {T} */ (item), index);
      }
    }

    /**
     * @param {T} item
     * @param {number} index
     */
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

    checkComplete();
  });
}
