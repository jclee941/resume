import { processInParallel } from './process-in-parallel.js';
import { sleep } from './shared.js';

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
