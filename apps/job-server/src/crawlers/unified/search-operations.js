import { JobMatcher } from '../../shared/services/matching/index.js';
import { WANTED_CATEGORIES } from './platform-crawlers.js';

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

export async function searchWithMatching(crawlerContext, params = {}) {
  const searchResult = await crawlerContext.searchAll(params);

  if (!searchResult.success || searchResult.jobs.length === 0) {
    return searchResult;
  }

  const matcher = getJobMatcher(crawlerContext);

  const matchedResult = matcher.filterAndRankJobs(searchResult.jobs, {
    resumePath: crawlerContext.resumePath,
    minScore: params.minScore !== undefined ? params.minScore : 50,
    maxResults: params.maxResults || 50,
    excludeCompanies: params.excludeCompanies || [],
  });

  const prioritizedJobs = matcher.prioritizeApplications(matchedResult.jobs);

  return {
    success: true,
    totalJobs: prioritizedJobs.length,
    sourceStats: searchResult.sourceStats,
    resumeAnalysis: matchedResult.resumeAnalysis,
    jobs: prioritizedJobs,
  };
}

export async function searchRecommended(crawlerContext, options = {}) {
  const defaultCategories = [
    WANTED_CATEGORIES.SECURITY,
    WANTED_CATEGORIES.DEVOPS,
    WANTED_CATEGORIES.INFRA,
    WANTED_CATEGORIES.SYSTEM_ADMIN,
  ];
  const defaultKeywords = [
    '시니어 엔지니어',
    '클라우드 엔지니어',
    'SRE',
    'DevOps',
    'Infrastructure',
  ];

  const categoryResults = await crawlerContext.searchSource('wanted', {
    categories: options.categories || defaultCategories,
    experience: options.experience || 8,
    location: options.location || 'seoul',
    limit: 30,
  });

  const keywordResults = await Promise.all(
    (options.keywords || defaultKeywords).slice(0, 3).map((keyword) =>
      crawlerContext.searchAll({
        keyword,
        experience: options.experience || 8,
        limit: 10,
        sources: options.sources || ['wanted', 'linkedin'],
      })
    )
  );

  const allJobs = [
    ...(categoryResults.jobs || []),
    ...keywordResults.flatMap((result) => result.jobs || []),
  ];
  const uniqueJobs = crawlerContext.deduplicateJobs(allJobs);
  const matcher = getJobMatcher(crawlerContext);
  const matchedResult = matcher.filterAndRankJobs(uniqueJobs, {
    resumePath: crawlerContext.resumePath,
    minScore: options.minScore || 60,
    maxResults: options.maxResults || 30,
  });

  return {
    success: true,
    totalJobs: matchedResult.jobs.length,
    resumeAnalysis: matchedResult.resumeAnalysis,
    jobs: matcher.prioritizeApplications(matchedResult.jobs),
  };
}

function getJobMatcher(crawlerContext) {
  if (crawlerContext.jobMatcher) {
    return crawlerContext.jobMatcher;
  }

  return new JobMatcher({
    resumeReader: crawlerContext.resumeReader,
    scoringConfig: crawlerContext.scoringConfig,
  });
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
