/**
 * @typedef {{
 *   searchResults(): {
 *     get(key: string): unknown[] | null | undefined;
 *     set(key: string, value: unknown[]): void;
 *   };
 * }} StrategyCache
 *
 * @typedef {{
 *   useCache?: boolean;
 *   parallelSearch?: boolean;
 *   enabledPlatforms: string[];
 *   [key: string]: unknown;
 * }} StrategyConfig
 *
 * @typedef {{
 *   search(platform: string, keywords: string[], options: unknown): Promise<unknown[]>;
 * }} StrategyCrawler
 *
 * @typedef {{
 *   info(message: string, ...args: unknown[]): void;
 *   error(message: string, ...args: unknown[]): void;
 * }} StrategyLogger
 *
 * @typedef {{
 *   mark(name: string): void;
 *   measure(name: string, meta?: Record<string, unknown>): void;
 *   increment(name: string): void;
 * }} StrategyMetrics
 *
 * @typedef {{
 *   platforms?: string[];
 *   [key: string]: unknown;
 * }} StrategyOptions
 *
 * @typedef {{
 *   startTime?: number | null;
 *   cached: number;
 *   searched: number;
 *   [key: string]: unknown;
 * }} StrategyStats
 *
 * @typedef {{
 *   cache: StrategyCache;
 *   config: StrategyConfig;
 *   crawler: StrategyCrawler;
 *   keywords: string[];
 *   logger: StrategyLogger;
 *   metrics: StrategyMetrics;
 *   options: StrategyOptions;
 *   stats: StrategyStats;
 * }} SearchJobsParams
 *
 * @typedef {{
 *   crawler: StrategyCrawler;
 *   jobs: unknown[];
 *   keywords: string[];
 *   logger: StrategyLogger;
 *   metrics: StrategyMetrics;
 *   options: StrategyOptions;
 *   platforms: string[];
 * }} SearchPlatformsParams
 */

/**
 * @param {SearchJobsParams} params
 * @returns {Promise<unknown[]>}
 */
export async function searchJobsWithStrategy({
  cache,
  config,
  crawler,
  keywords,
  logger,
  metrics,
  options,
  stats,
}) {
  metrics.mark('search:start');
  stats.startTime = Date.now();

  const cacheKey = `search:${keywords.join(',')}:${JSON.stringify(options)}`;

  if (config.useCache) {
    const cached = cache.searchResults().get(cacheKey);
    if (cached) {
      metrics.increment('cache.search.hit');
      stats.cached += cached.length;
      logger.info(`📦 Cache hit: ${cached.length} jobs`);
      return cached;
    }
    metrics.increment('cache.search.miss');
  }

  /** @type {unknown[]} */
  const jobs = [];
  const platforms = options.platforms || config.enabledPlatforms;

  if (config.parallelSearch) {
    await searchPlatformsInParallel({
      crawler,
      jobs,
      keywords,
      logger,
      metrics,
      options,
      platforms,
    });
  } else {
    await searchPlatformsSequentially({
      crawler,
      jobs,
      keywords,
      logger,
      metrics,
      options,
      platforms,
    });
  }

  stats.searched = jobs.length;
  metrics.measure('search:start', { count: jobs.length });

  if (config.useCache) {
    cache.searchResults().set(cacheKey, jobs);
  }

  return jobs;
}

/**
 * @param {SearchPlatformsParams} params
 */
async function searchPlatformsInParallel({
  crawler,
  jobs,
  keywords,
  logger,
  metrics,
  options,
  platforms,
}) {
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      metrics.mark(`search:${platform}`);
      try {
        const result = await crawler.search(platform, keywords, options);
        metrics.measure(`search:${platform}`, { platform });
        return { platform, jobs: result || [] };
      } catch (error) {
        metrics.measure(`search:${platform}`, {
          platform,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      jobs.push(...result.value.jobs);
      metrics.increment(`search.${result.value.platform}.success`);
    } else {
      logger.error('Search failed:', result.reason);
      metrics.increment('search.error');
    }
  }
}

/**
 * @param {SearchPlatformsParams} params
 */
async function searchPlatformsSequentially({
  crawler,
  jobs,
  keywords,
  logger,
  metrics,
  options,
  platforms,
}) {
  for (const platform of platforms) {
    metrics.mark(`search:${platform}`);
    try {
      const result = await crawler.search(platform, keywords, options);
      if (result) jobs.push(...result);
      metrics.measure(`search:${platform}`, { platform, success: true });
    } catch (e) {
      logger.error(`Failed to search platform ${platform}:`, e);
      metrics.measure(`search:${platform}`, { platform, success: false });
    }
  }
}
