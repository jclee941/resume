import { processInParallel } from './process-in-parallel.js';
import { sleep } from './shared.js';

/**
 * @template T
 * @template R
 * @typedef {{
 *   maxConcurrency?: number;
 *   delayBetweenApps?: number;
 *   onProgress?: import('./process-in-parallel.js').ProcessInParallelOptions<T, R>['onProgress'];
 * }} ApplyToJobsOptions
 */

/**
 * @template T
 * @template R
 * @param {T[]} jobs
 * @param {(job: T) => Promise<R> | R} applyFn
 * @param {ApplyToJobsOptions<T, R>} [options]
 * @returns {Promise<import('./process-in-parallel.js').ParallelTaskResult<T, R>[]>}
 */
export async function applyToJobsParallel(jobs, applyFn, options = {}) {
  const { maxConcurrency = 2, delayBetweenApps = 3000 } = options;

  return processInParallel(
    jobs,
    async (job, index) => {
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
