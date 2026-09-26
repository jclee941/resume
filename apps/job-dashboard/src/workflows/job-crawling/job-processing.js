import { calculateMatchScore } from '../../handlers/auto-apply/match-scoring.js';
import { loadMatchingConfig } from '../application/matching-config.js';

/** @typedef {import('../application/matching-config.js').MatchingConfig} MatchingConfig */

/**
 * @typedef {Object} CrawledJob
 * @property {string} company
 * @property {string} position
 * @property {string} [source]
 * @property {number} [matchScore]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [location]
 * @property {string[]} [skills]
 * @property {string[]} [techStack]
 */

/**
 * @typedef {Object} CrawlResults
 * @property {Record<string, { jobs?: CrawledJob[] }>} platforms
 */

/**
 * Flatten platform crawl results and deduplicate by company and position.
 *
 * @param {CrawlResults} results
 * @returns {CrawledJob[]}
 */
export function collectDeduplicatedJobs(results) {
  const allJobs = [];
  for (const platform of Object.keys(results.platforms)) {
    const jobs = results.platforms[platform].jobs || [];
    allJobs.push(...jobs.map((job) => ({ ...job, source: platform })));
  }

  const seen = new Set();
  return allJobs.filter((job) => {
    const key = `${job.company}:${job.position}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Score and filter crawled jobs against persisted matching config.
 *
 * @param {Parameters<typeof loadMatchingConfig>[0]} env
 * @param {CrawledJob[]} jobs
 * @returns {Promise<CrawledJob[]>}
 */
export async function matchJobs(env, jobs) {
  const config = await getMatchingConfig(env);
  return jobs
    .map((job) => ({
      ...job,
      matchScore: calculateMatchScore(
        job,
        /** @type {MatchingConfig & { skills?: string[], preferredCompanies?: string[], excludeCompanies?: string[], preferredLocations?: string[] }} */ (
          config
        )
      ),
    }))
    .filter((job) => job.matchScore >= (config.minMatchScore || 70))
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * @param {Parameters<typeof loadMatchingConfig>[0]} env
 * @returns {Promise<MatchingConfig>}
 */
export async function getMatchingConfig(env) {
  return loadMatchingConfig(env);
}
