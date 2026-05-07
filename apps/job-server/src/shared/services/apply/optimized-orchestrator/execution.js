import { applyToJobsParallel, batchProcess } from '../../parallel.js';
import { getTodayApplicationCount, recordApplyFailure, sleep } from './error-handler.js';

export async function applyToJobsWithStrategy(context) {
  const { appManager, applySingleJob, config, dryRun, jobs, logger, metrics, stats } = context;
  metrics.mark('apply:start');

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
        message: 'Would apply',
      });
      stats.applied++;
    }
  } else if (config.parallelApply && config.useBrowserPool) {
    results.push(...(await applyParallelWithPool({ ...context, jobs: toApply })));
  } else if (config.parallelApply) {
    results.push(...(await applyParallel({ applySingleJob, config, jobs: toApply, logger })));
  } else {
    results.push(...(await applySequential({ applySingleJob, config, jobs: toApply })));
  }

  stats.skipped = jobs.length - toApply.length;
  stats.endTime = Date.now();

  metrics.measure('apply:start', {
    count: results.length,
    success: results.filter((r) => r.success).length,
  });

  return {
    results,
    applied: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    skipped: stats.skipped,
  };
}

export async function applySequential({ applySingleJob, config, jobs }) {
  const results = [];

  for (const job of jobs) {
    const result = await applySingleJob(job);
    results.push(result);
    await sleep(config.delayBetweenApplies);
  }

  return results;
}

export function applyParallel({ applySingleJob, config, jobs, logger }) {
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

export async function applyParallelWithPool({ applier, browserPool, config, jobs, logger }) {
  const results = [];

  await applyToJobsParallel(jobs, (job) => applyJobWithPooledBrowser({ applier, browserPool, job }), {
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
  }).then((r) => results.push(...r));

  return results;
}

async function applyJobWithPooledBrowser({ applier, browserPool, job }) {
  const pooled = await browserPool.acquire();
  const originalBrowser = applier.browser;
  const originalPage = applier.page;

  try {
    applier.browser = pooled.browser;
    applier.page = pooled.page;

    return await applier.applyToJob(job);
  } finally {
    applier.browser = originalBrowser;
    applier.page = originalPage;
    await browserPool.release(pooled);
  }
}

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
    return recordApplyFailure({ error, job, logger, metrics, startTime, stats });
  }
}

export function applyInBatchesWithStrategy({ applySingleJob, config, jobs, logger, options }) {
  const { batchSize = 10, delayBetweenBatches = 5000 } = options;

  return batchProcess(jobs, async (job) => applySingleJob(job), {
    batchSize,
    delayBetweenBatches,
    concurrency: config.maxConcurrentApplies,
    onBatchComplete: ({ batchNumber, totalBatches, completed, total }) => {
      logger.info(`  📦 Batch ${batchNumber}/${totalBatches} complete (${completed}/${total} total)`);
    },
  });
}
