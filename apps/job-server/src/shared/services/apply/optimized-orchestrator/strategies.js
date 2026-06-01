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
          error: error.message,
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
