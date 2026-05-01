import { calculateMatchScore } from '../../handlers/auto-apply/match-scoring.js';

/**
 * Flatten platform crawl results and deduplicate by company and position.
 *
 * @param {{platforms: Record<string, {jobs?: Object[]}>}} results
 * @returns {Object[]}
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
 * @param {Object} env
 * @param {Object[]} jobs
 * @returns {Promise<Object[]>}
 */
export async function matchJobs(env, jobs) {
  const config = await getMatchingConfig(env);
  return jobs
    .map((job) => ({
      ...job,
      matchScore: calculateMatchScore(job, config),
    }))
    .filter((job) => job.matchScore >= (config.minMatchScore || 70))
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * @param {Object} env
 * @returns {Promise<Object>}
 */
export async function getMatchingConfig(env) {
  try {
    const config = await env.JOB_DB.prepare(
      "SELECT value FROM config WHERE key = 'auto_apply_config'"
    ).first();
    return config?.value ? JSON.parse(config.value) : { minMatchScore: 70 };
  } catch {
    return { minMatchScore: 70 };
  }
}
