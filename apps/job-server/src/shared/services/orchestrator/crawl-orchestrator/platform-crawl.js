/**
 * @fileoverview Platform crawl execution for crawl orchestration.
 */

/**
 * Run platform crawls with bounded concurrency.
 *
 * @param {object} orchestrator
 * @param {string[]} platforms
 * @param {SearchParams} searchParams
 * @param {Map<string,string>} taskMap platform→taskId
 * @param {CrawlOrchestratorOptions} opts
 * @returns {Promise<Map<string, PlatformResult>>}
 */
export async function executeWithConcurrency(orchestrator, platforms, searchParams, taskMap, opts) {
  const results = new Map();
  const concurrency = opts.concurrency;
  let index = 0;

  const worker = async () => {
    while (index < platforms.length) {
      if (orchestrator._abortController.signal.aborted) break;

      const i = index++;
      const platform = platforms[i];
      const taskId = taskMap.get(platform);

      const result = await orchestrator._crawlPlatform(platform, searchParams, taskId, opts);
      results.set(platform, result);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, platforms.length) }, () => worker());
  await Promise.allSettled(workers);

  return results;
}

/**
 * Crawl a single platform with rate limiting and progress tracking.
 *
 * @param {object} orchestrator
 * @param {string} platform
 * @param {SearchParams} searchParams
 * @param {string} taskId
 * @returns {Promise<PlatformResult>}
 */
export async function crawlPlatform(orchestrator, platform, searchParams, taskId) {
  const startTime = Date.now();
  orchestrator.progressTracker.startTask(taskId);
  orchestrator.emit('platform:start', { platform, taskId });

  try {
    if (orchestrator._abortController.signal.aborted) {
      orchestrator.progressTracker.cancelTask(taskId);
      return { platform, status: 'cancelled', jobs: [], error: null, durationMs: 0 };
    }

    await orchestrator.rateLimiter.acquire(platform);
    const jobs = await orchestrator._executePlatformCrawl(platform, searchParams);
    orchestrator.rateLimiter.recordResponse(platform, { statusCode: 200 });

    orchestrator.progressTracker.updateProgress(taskId, {
      itemsProcessed: jobs.length,
      itemsTotal: jobs.length,
      progress: 100,
    });

    const durationMs = Date.now() - startTime;
    orchestrator.progressTracker.completeTask(taskId, {
      jobCount: jobs.length,
      durationMs,
    });

    orchestrator.emit('platform:complete', { platform, taskId, jobCount: jobs.length, durationMs });

    return { platform, status: 'success', jobs, error: null, durationMs };
  } catch (error) {
    return handlePlatformCrawlError(orchestrator, platform, taskId, error, Date.now() - startTime);
  }
}

/**
 * Execute the actual crawl for one platform using the unified crawler.
 *
 * @param {string} platform
 * @param {SearchParams} searchParams
 * @returns {Promise<object[]>}
 */
export async function executePlatformCrawl(platform, searchParams) {
  const { default: UnifiedJobCrawler } = await import('../../../crawlers/index.js');
  const crawler = new UnifiedJobCrawler();

  const results = await crawler.search(platform, searchParams.keywords, {
    location: searchParams.location,
    experience: searchParams.experience,
    limit: searchParams.limit,
    ...searchParams.extra,
  });

  return results || [];
}

/**
 * Convert a platform crawl error into a platform result.
 *
 * @param {object} orchestrator
 * @param {string} platform
 * @param {string} taskId
 * @param {Error & { statusCode?: number, status?: number, retryAfter?: number }} error
 * @param {number} durationMs
 * @returns {PlatformResult}
 */
export function handlePlatformCrawlError(orchestrator, platform, taskId, error, durationMs) {
  const statusCode = error.statusCode || error.status || 500;
  orchestrator.rateLimiter.recordResponse(platform, {
    statusCode,
    retryAfterMs: error.retryAfter ? error.retryAfter * 1000 : undefined,
  });

  orchestrator.progressTracker.failTask(taskId, error);
  orchestrator.emit('platform:error', { platform, taskId, error, durationMs });

  return {
    platform,
    status: 'error',
    jobs: [],
    error: { message: error.message, code: statusCode },
    durationMs,
  };
}
