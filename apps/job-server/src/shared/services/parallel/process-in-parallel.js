import { sleep } from './shared.js';

/**
 * Process items in parallel with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} processor - Async processor function
 * @param {Object} options
 * @returns {Promise<Array>}
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

    checkComplete();
  });
}
