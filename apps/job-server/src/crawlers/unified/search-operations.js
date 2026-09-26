export { searchRecommended, searchWithMatching } from './search-matching-operations.js';

export async function searchAll(crawlerContext, params = {}) {
  const {
    keyword,
    categories = [],
    experience,
    location,
    limit = 20,
    sources = crawlerContext.enabledSources,
  } = params;

  const results = await Promise.allSettled(
    sources.map((source) =>
      crawlerContext.searchSource(source, {
        keyword,
        categories,
        experience,
        location,
        limit,
      })
    )
  );

  const allJobs = [];
  const sourceStats = {};

  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'fulfilled' && result.value.success) {
      allJobs.push(...result.value.jobs);
      sourceStats[source] = {
        success: true,
        count: result.value.jobs.length,
      };
    } else {
      sourceStats[source] = {
        success: false,
        error: result.reason?.message || result.value?.error || 'Unknown error',
      };
    }
  });

  const uniqueJobs = crawlerContext.deduplicateJobs(allJobs);

  return {
    success: true,
    totalJobs: uniqueJobs.length,
    sourceStats,
    jobs: uniqueJobs,
  };
}

export async function searchSource(crawlerContext, source, params) {
  const crawler = crawlerContext.crawlers[source];
  if (!crawler) {
    return { success: false, error: `Unknown source: ${source}`, jobs: [] };
  }

  const sourceParams = crawlerContext.convertParams(source, params);

  if (params.keyword) {
    if (source === 'wanted' && crawler.searchByKeyword) {
      return crawler.searchByKeyword(params.keyword, sourceParams);
    }
    return crawler.searchJobs({ ...sourceParams, keyword: params.keyword });
  }

  return crawler.searchJobs(sourceParams);
}

export async function search(crawlerContext, platform, keywords, options = {}) {
  const keywordList = Array.isArray(keywords) ? keywords : [keywords];
  const allJobs = [];
  const maxConcurrency = Math.max(1, options.maxConcurrency || keywordList.length);
  const rateLimiter = options.rateLimiter;
  const jobDeduplicator = options.jobDeduplicator;

  for (let i = 0; i < keywordList.length; i += maxConcurrency) {
    const batch = keywordList.slice(i, i + maxConcurrency);
    const searchPromises = batch.map((keyword) =>
      searchKeyword(crawlerContext, platform, keyword, options, rateLimiter, jobDeduplicator)
    );
    const batchResults = await Promise.allSettled(searchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
      }
    }
  }

  if (!jobDeduplicator) {
    return crawlerContext.deduplicateJobs(allJobs);
  }
  return allJobs;
}

async function searchKeyword(
  crawlerContext,
  platform,
  keyword,
  options,
  rateLimiter,
  jobDeduplicator
) {
  try {
    if (rateLimiter) {
      await rateLimiter.acquire(platform);
    }

    const result = await crawlerContext.searchSource(platform, {
      keyword,
      limit: options.limit || 20,
      ...options,
    });

    if (rateLimiter) {
      const statusCode = result.success ? 200 : result.error?.status || 500;
      rateLimiter.recordResponse(platform, { statusCode });
    }

    if (result.success && result.jobs) {
      return filterNewJobs(result.jobs, jobDeduplicator);
    }
    return [];
  } catch (error) {
    console.error(`[search] Keyword "${keyword}" failed:`, error.message);
    if (rateLimiter) {
      rateLimiter.recordResponse(platform, { statusCode: error.statusCode || 500 });
    }
    return [];
  }
}

function filterNewJobs(jobs, jobDeduplicator) {
  const newJobs = [];
  for (const job of jobs) {
    const isDuplicate = jobDeduplicator ? jobDeduplicator.isDuplicate(job) : false;
    if (!isDuplicate) {
      newJobs.push(job);
      if (jobDeduplicator) {
        jobDeduplicator.markSeen(job);
      }
    }
  }
  return newJobs;
}
