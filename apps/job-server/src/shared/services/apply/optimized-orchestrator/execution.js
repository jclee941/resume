import { applyToJobsParallel, batchProcess } from '../../parallel.js';
import { getTodayApplicationCount, recordApplyFailure, sleep } from './error-handler.js';

/**
 * @typedef {import('./error-handler.js').OptimizedApplyStats} OptimizedApplyStats
 * @typedef {import('./error-handler.js').OrchestratorJob} OrchestratorJob
 * @typedef {import('./error-handler.js').OrchestratorMetrics} OrchestratorMetrics
 * @typedef {import('./error-handler.js').OrchestratorLogger} OrchestratorLogger
 *
 * @typedef {{
 *   maxDailyApplications: number;
 *   parallelApply?: boolean;
 *   useBrowserPool?: boolean;
 *   delayBetweenApplies?: number;
 *   maxConcurrentApplies?: number;
 * }} ExecutionConfig
 *
 * @typedef {{
 *   job?: OrchestratorJob;
 *   success: boolean;
 *   dryRun?: boolean;
 *   skipped?: boolean;
 *   message?: string;
 *   error?: unknown;
 *   duration?: number;
 *   [key: string]: unknown;
 * }} SingleJobApplyResult
 *
 * @typedef {import('../../parallel/process-in-parallel.js').ParallelTaskResult<OrchestratorJob, SingleJobApplyResult> & {
 *   skipped?: boolean;
 * }} ParallelApplyResult
 *
 * @typedef {SingleJobApplyResult | ParallelApplyResult} ExecutionItemResult
 *
 * @typedef {{
 *   browser?: unknown;
 *   page?: unknown;
 *   applyToJob(job: OrchestratorJob): Promise<SingleJobApplyResult>;
 * }} Applier
 *
 * @typedef {{
 *   acquire(): Promise<{ browser: unknown; page: unknown }>;
 *   release(pooled: { browser: unknown; page: unknown }): Promise<void>;
 * }} BrowserPool
 *
 * @typedef {{
 *   appManager?: { listApplications(options?: { fromDate?: string }): Array<{ status?: string }> } | null;
 *   applySingleJob: (job: OrchestratorJob) => Promise<SingleJobApplyResult>;
 *   config: ExecutionConfig;
 *   dryRun?: boolean;
 *   jobs: OrchestratorJob[];
 *   logger: OrchestratorLogger & { log(msg: string): void; info(msg: string): void };
 *   metrics: OrchestratorMetrics & { mark(name: string): void; histogram(name: string, val: number): void };
 *   stats: OptimizedApplyStats;
 *   applier?: Applier;
 *   browserPool?: BrowserPool;
 * }} ExecutionContext
 */

/**
 * @param {ExecutionContext} context
 */
export async function applyToJobsWithStrategy(context) {
  const { appManager, applySingleJob, config, dryRun, jobs, logger, metrics, stats } = context;
  metrics.mark('apply:start');

  /** @type {ExecutionItemResult[]} */
  const results = [];
  const todayCount = getTodayApplicationCount(appManager);
  const remaining = config.maxDailyApplications - todayCount;

  if (remaining <= 0) {
    return {
      results: [],
      skipped: jobs.length,
      reason: 'Daily limit reached',
    };
  }

  const toApply = jobs.slice(0, remaining);

  if (dryRun) {
    for (const job of toApply) {
      results.push({
        job,
        success: true,
        dryRun: true,
        skipped: true,
        message: 'Would apply',
      });
    }
  } else if (config.parallelApply && config.useBrowserPool) {
    results.push(...(await applyParallelWithPool({ ...context, jobs: toApply })));
  } else if (config.parallelApply) {
    results.push(...(await applyParallel({ applySingleJob, config, jobs: toApply, logger })));
  } else {
    results.push(...(await applySequential({ applySingleJob, config, jobs: toApply })));
  }

  stats.skipped = jobs.length - toApply.length + results.filter((r) => r.skipped).length;
  stats.endTime = Date.now();

  metrics.measure('apply:start', {
    count: results.length,
    success: results.filter((r) => r.success).length,
  });

  return {
    results,
    applied: dryRun ? 0 : results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success && !r.skipped).length,
    skipped: stats.skipped,
  };
}

/**
 * @param {{
 *   applySingleJob: (job: OrchestratorJob) => Promise<SingleJobApplyResult>;
 *   config: ExecutionConfig;
 *   jobs: OrchestratorJob[];
 * }} options
 * @returns {Promise<SingleJobApplyResult[]>}
 */
async function applySequential({ applySingleJob, config, jobs }) {
  const results = [];

  for (const job of jobs) {
    const result = await applySingleJob(job);
    results.push(result);
    await sleep(/** @type {number} */ (config.delayBetweenApplies));
  }

  return results;
}

/**
 * @param {{
 *   applySingleJob: (job: OrchestratorJob) => Promise<SingleJobApplyResult>;
 *   config: ExecutionConfig;
 *   jobs: OrchestratorJob[];
 *   logger: OrchestratorLogger & { info(msg: string): void };
 * }} options
 * @returns {Promise<ParallelApplyResult[]>}
 */
function applyParallel({ applySingleJob, config, jobs, logger }) {
  return applyToJobsParallel(jobs, async (job) => applySingleJob(job), {
    maxConcurrency: config.maxConcurrentApplies,
    delayBetweenApps: config.delayBetweenApplies,
    onProgress: ({ completed, total }) => {
      if (completed % 5 === 0 || completed === total) {
        logger.info(`  📊 Progress: ${completed}/${total} applications`);
      }
    },
  });
}

/**
 * @param {{
 *   applier?: Applier;
 *   browserPool?: BrowserPool;
 *   config: ExecutionConfig;
 *   jobs: OrchestratorJob[];
 *   logger: OrchestratorLogger & { log(msg: string): void; info(msg: string): void };
 * }} options
 * @returns {Promise<ParallelApplyResult[]>}
 */
async function applyParallelWithPool({ applier, browserPool, config, jobs, logger }) {
  /** @type {ParallelApplyResult[]} */
  const results = [];

  await applyToJobsParallel(
    jobs,
    (job) => applyJobWithPooledBrowser({ applier, browserPool, job }),
    {
      maxConcurrency: config.maxConcurrentApplies,
      delayBetweenApps: config.delayBetweenApplies,
      onProgress: ({ completed, total, current, result }) => {
        const job = current;
        if (result.success) {
          logger.log(`  ✅ Applied: ${job.company || job.title}`);
        } else {
          logger.error(`  ❌ Failed: ${job.company || job.title} - ${result.error}`);
        }

        if (completed % 5 === 0 || completed === total) {
          logger.info(`  📊 Progress: ${completed}/${total} applications`);
        }
      },
    }
  ).then((r) => results.push(...r));

  return results;
}

/**
 * @param {{
 *   applier?: Applier;
 *   browserPool?: BrowserPool;
 *   job: OrchestratorJob;
 * }} options
 * @returns {Promise<SingleJobApplyResult>}
 */
async function applyJobWithPooledBrowser({ applier, browserPool, job }) {
  const pooled = await /** @type {BrowserPool} */ (browserPool).acquire();
  const originalBrowser = /** @type {Applier} */ (applier).browser;
  const originalPage = /** @type {Applier} */ (applier).page;

  try {
    /** @type {Applier} */ (applier).browser = pooled.browser;
    /** @type {Applier} */ (applier).page = pooled.page;

    return await /** @type {Applier} */ (applier).applyToJob(job);
  } finally {
    /** @type {Applier} */ (applier).browser = originalBrowser;
    /** @type {Applier} */ (applier).page = originalPage;
    await /** @type {BrowserPool} */ (browserPool).release(pooled);
  }
}

/**
 * @param {{
 *   applier: Applier;
 *   job: OrchestratorJob;
 *   logger: OrchestratorLogger & { log(msg: string): void };
 *   metrics: OrchestratorMetrics & { mark(name: string): void; histogram(name: string, val: number): void };
 *   stats: OptimizedApplyStats;
 * }} options
 * @returns {Promise<SingleJobApplyResult>}
 */
export async function applySingleJobWithMetrics({ applier, job, logger, metrics, stats }) {
  const startTime = Date.now();
  metrics.mark(`apply:job:${job.id}`);

  try {
    logger.log(`  🎯 Applying to: ${job.company || job.title} (${job.source})`);

    const result = await applier.applyToJob(job);
    const duration = Date.now() - startTime;

    metrics.measure(`apply:job:${job.id}`, {
      source: job.source,
      success: result.success,
      duration,
    });

    metrics.histogram('apply.duration', duration);

    if (result.success) {
      stats.applied++;
      metrics.increment('apply.success');
    } else {
      stats.failed++;
      metrics.increment('apply.failed');
      logger.error(`❌ Apply failed for ${job.company || job.title}: ${result.error}`);
    }

    return { job, ...result, duration };
  } catch (error) {
    return recordApplyFailure(
      /** @type {{ error: Error; job: OrchestratorJob; logger: OrchestratorLogger; metrics: OrchestratorMetrics; startTime: number; stats: OptimizedApplyStats }} */ ({
        error,
        job,
        logger,
        metrics,
        startTime,
        stats,
      })
    );
  }
}

/**
 * @param {{
 *   applySingleJob: (job: OrchestratorJob) => Promise<SingleJobApplyResult>;
 *   config: ExecutionConfig;
 *   jobs: OrchestratorJob[];
 *   logger: OrchestratorLogger & { info(msg: string): void };
 *   options: { batchSize?: number; delayBetweenBatches?: number };
 * }} options
 * @returns {Promise<ParallelApplyResult[]>}
 */
export function applyInBatchesWithStrategy({ applySingleJob, config, jobs, logger, options }) {
  const { batchSize = 10, delayBetweenBatches = 5000 } = options;

  return batchProcess(jobs, async (job) => applySingleJob(job), {
    batchSize,
    delayBetweenBatches,
    concurrency: config.maxConcurrentApplies,
    onBatchComplete: ({ batchNumber, totalBatches, completed, total }) => {
      logger.info(
        `  📦 Batch ${batchNumber}/${totalBatches} complete (${completed}/${total} total)`
      );
    },
  });
}
