import { processInParallel } from './process-in-parallel.js';
import { sleep } from './shared.js';

/**
 * @template T
 * @template R
 * @typedef {{
 *   batchNumber: number;
 *   totalBatches: number;
 *   completed: number;
 *   total: number;
 *   results: import('./process-in-parallel.js').ParallelTaskResult<T, R>[];
 * }} BatchCompleteInfo
 */

/**
 * @template T
 * @template R
 * @typedef {{
 *   batchSize?: number;
 *   delayBetweenBatches?: number;
 *   concurrency?: number;
 *   onBatchComplete?: (info: BatchCompleteInfo<T, R>) => void;
 * }} BatchProcessOptions
 */

/**
 * @template T
 * @template R
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<R> | R} processor
 * @param {BatchProcessOptions<T, R>} [options]
 * @returns {Promise<import('./process-in-parallel.js').ParallelTaskResult<T, R>[]>}
 */
export async function batchProcess(items, processor, options = {}) {
  const { batchSize = 10, delayBetweenBatches = 1000, concurrency = 1, onBatchComplete } = options;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);
    const batchResults = await processInParallel(batch, processor, { concurrency });

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

    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}
