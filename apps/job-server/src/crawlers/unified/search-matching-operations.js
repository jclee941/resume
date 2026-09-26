import { JobMatcher } from '../../shared/services/matching/index.js';
import { WANTED_CATEGORIES } from './platform-crawlers.js';

/**
 * @typedef {Object} SearchWithMatchingParams
 * @property {number} [minScore]
 * @property {number} [maxResults]
 * @property {string[]} [excludeCompanies]
 * @property {string} [keyword]
 * @property {number} [limit]
 * @property {string[]} [sources]
 * @property {string | number} [experience]
 * @property {boolean} [writeProposals]
 * @property {string[]} [categories]
 * @property {string} [location]
 */

/**
 * @typedef {Object} SearchRecommendedOptions
 * @property {string[]} [categories]
 * @property {number | string} [experience]
 * @property {string} [location]
 * @property {string[]} [keywords]
 * @property {string[]} [sources]
 * @property {number} [minScore]
 * @property {number} [maxResults]
 */

/**
 * @typedef {Object} CrawlerContext
 * @property {JobMatcher} [jobMatcher]
 * @property {Parameters<typeof JobMatcher.prototype.filterAndRankJobs>[1] extends infer O ? (O extends { resumeReader?: infer R } ? R : never) : never} [resumeReader]
 * @property {Parameters<typeof JobMatcher.prototype.filterAndRankJobs>[1] extends infer O ? (O extends { scoringConfig?: infer S } ? S : never) : never} [scoringConfig]
 * @property {string} [resumePath]
 * @property {(params: SearchWithMatchingParams | Record<string, unknown>) => Promise<{ success: boolean; jobs: Record<string, unknown>[]; sourceStats?: unknown }>} searchAll
 * @property {(source: string, params: Record<string, unknown>) => Promise<{ success: boolean; jobs?: Record<string, unknown>[] }>} searchSource
 * @property {(jobs: Record<string, unknown>[]) => Record<string, unknown>[]} deduplicateJobs
 */

/**
 * @param {CrawlerContext} crawlerContext
 * @returns {JobMatcher}
 */
function getJobMatcher(crawlerContext) {
  if (crawlerContext.jobMatcher) {
    return crawlerContext.jobMatcher;
  }

  return new JobMatcher({
    resumeReader: crawlerContext.resumeReader,
    scoringConfig: crawlerContext.scoringConfig,
  });
}

/**
 * @param {CrawlerContext} crawlerContext
 * @param {SearchWithMatchingParams} [params]
 */
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

/**
 * @param {CrawlerContext} crawlerContext
 * @param {SearchRecommendedOptions} [options]
 */
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
