export { searchRecommended, searchWithMatching } from './search-matching-operations.js';

/**
 * @typedef {import('./job-normalization.js').DeduplicableJob} DeduplicableJob
 * @typedef {import('./job-normalization.js').ConvertedParams} ConvertedParams
 *
 * @typedef {Record<string, unknown> & {
 *   success: boolean;
 *   jobs?: DeduplicableJob[];
 *   error?: unknown;
 * }} CrawlerSearchResult
 *
 * @typedef {Object} PlatformCrawler
 * @property {(params: Record<string, unknown>) => Promise<CrawlerSearchResult>} searchJobs
 * @property {(keyword: string, params: Record<string, unknown>) => Promise<CrawlerSearchResult>} [searchByKeyword]
 * @property {(jobId: string) => Promise<unknown>} getJobDetail
 * @property {unknown} [cookies]
 *
 * @typedef {Object} RateLimiter
 * @property {(platform: string) => Promise<void>} acquire
 * @property {(platform: string, response: { statusCode: number }) => void} recordResponse
 *
 * @typedef {Object} JobDeduplicator
 * @property {(job: unknown) => boolean} isDuplicate
 * @property {(job: unknown) => void} markSeen
 *
 * @typedef {Object} UnifiedCrawlerContext
 * @property {string[]} enabledSources
 * @property {Record<string, PlatformCrawler>} crawlers
 * @property {(source: string, params: Record<string, unknown>) => Promise<CrawlerSearchResult>} searchSource
 * @property {(source: string, params: Record<string, unknown>) => ConvertedParams} convertParams
 * @property {(jobs: DeduplicableJob[]) => DeduplicableJob[]} deduplicateJobs
 *
 * @typedef {Object} SearchAllParams
 * @property {string} [keyword]
 * @property {string[]} [categories]
 * @property {string} [experience]
 * @property {string} [location]
 * @property {number} [limit]
 * @property {string[]} [sources]
 *
 * @typedef {Record<string, unknown> & {
 *   maxConcurrency?: number;
 *   rateLimiter?: RateLimiter;
 *   jobDeduplicator?: JobDeduplicator;
 *   limit?: number;
 * }} SearchOptions
 */

/**
 * @param {UnifiedCrawlerContext} crawlerContext
 * @param {SearchAllParams} [params]
 */
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

  /** @type {DeduplicableJob[]} */
  const allJobs = [];
  /** @type {Record<string, { success: boolean; count?: number; error?: unknown }>} */
  const sourceStats = {};

  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'fulfilled' && result.value.success) {
      allJobs.push(.../** @type {DeduplicableJob[]} */ (result.value.jobs));
      sourceStats[source] = {
        success: true,
        count: /** @type {DeduplicableJob[]} */ (result.value.jobs).length,
      };
    } else {
      sourceStats[source] = {
        success: false,
        error:
          /** @type {{ reason?: { message?: string } }} */ (result).reason?.message ||
          /** @type {{ value?: { error?: string } }} */ (result).value?.error ||
          'Unknown error',
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

/**
 * @param {UnifiedCrawlerContext} crawlerContext
 * @param {string} source
 * @param {Record<string, unknown> & { keyword?: string }} params
 */
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

/**
 * @param {UnifiedCrawlerContext} crawlerContext
 * @param {string} platform
 * @param {string | string[]} keywords
 * @param {SearchOptions} [options]
 */
export async function search(crawlerContext, platform, keywords, options = {}) {
  const keywordList = Array.isArray(keywords) ? keywords : [keywords];
  /** @type {DeduplicableJob[]} */
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

/**
 * @param {UnifiedCrawlerContext} crawlerContext
 * @param {string} platform
 * @param {string} keyword
 * @param {SearchOptions} options
 * @param {RateLimiter | undefined} rateLimiter
 * @param {JobDeduplicator | undefined} jobDeduplicator
 * @returns {Promise<DeduplicableJob[]>}
 */
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
      const statusCode = result.success
        ? 200
        : /** @type {{ status?: number }} */ (result.error)?.status || 500;
      rateLimiter.recordResponse(platform, { statusCode });
    }

    if (result.success && result.jobs) {
      return filterNewJobs(result.jobs, jobDeduplicator);
    }
    return [];
  } catch (error) {
    console.error(
      `[search] Keyword "${keyword}" failed:`,
      error instanceof Error ? error.message : String(error)
    );
    if (rateLimiter) {
      rateLimiter.recordResponse(platform, {
        statusCode: /** @type {{ statusCode?: number }} */ (error).statusCode || 500,
      });
    }
    return [];
  }
}

/**
 * @param {DeduplicableJob[]} jobs
 * @param {JobDeduplicator | undefined} jobDeduplicator
 * @returns {DeduplicableJob[]}
 */
function filterNewJobs(jobs, jobDeduplicator) {
  /** @type {DeduplicableJob[]} */
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
