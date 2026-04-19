import { processInParallel } from './process-in-parallel.js';
import { sleep } from './shared.js';

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
