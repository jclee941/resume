import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

export const WANTED_DETAIL_LIMIT = 400;
export const WANTED_DETAIL_CONCURRENCY = 4;

/** Annual-to values at or above this mean "no upper bound" on Wanted. */
const OPEN_ENDED_ANNUAL_TO = 50;
const WANTED_ID_PREFIX = 'wanted-';

/**
 * @typedef {import('./platforms.js').PlatformJob} PlatformJob
 * @typedef {{
 *   annual_from?: number | null;
 *   annual_to?: number | null;
 * }} WantedExperienceRange
 * @typedef {{
 *   main_tasks?: string;
 *   requirements?: string;
 *   preferred_points?: string;
 * }} WantedApiDetail
 * @typedef {WantedExperienceRange & {
 *   detail?: WantedApiDetail;
 * }} WantedApiJobDetail
 */

/**
 * Formats Wanted's annual range in the shapes match-scoring parses
 * ("3-5년", "3년 이상"). Returns '' when the range is unknown.
 * @param {WantedExperienceRange} range
 * @returns {string}
 */
export function formatWantedExperience(range) {
  const from = range.annual_from;
  const to = range.annual_to;
  if (typeof from !== 'number' || !Number.isFinite(from)) return '';
  if (typeof to !== 'number' || !Number.isFinite(to) || to >= OPEN_ENDED_ANNUAL_TO) {
    return `${from}년 이상`;
  }
  return to === from ? `${from}년` : `${from}-${to}년`;
}

/**
 * Joins the role-specific text sections. Company intro and benefits are left
 * out: they are boilerplate that skews skill and experience matching.
 * @param {WantedApiDetail | undefined} detail
 * @returns {string}
 */
function buildWantedDescription(detail) {
  return [detail?.main_tasks, detail?.requirements, detail?.preferred_points]
    .filter((section) => typeof section === 'string' && section.trim() !== '')
    .join('\n');
}

/**
 * @param {string} session
 * @param {PlatformJob} job
 * @returns {Promise<PlatformJob>}
 */
async function enrichWantedJob(session, job) {
  const rawId = job.id.slice(WANTED_ID_PREFIX.length);
  const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs/${rawId}`, {
    headers: { Cookie: session, 'User-Agent': DEFAULT_USER_AGENT },
  });
  if (!response.ok) throw new Error(`Wanted detail error: ${response.status}`);
  /** @type {{ job?: WantedApiJobDetail }} */
  const data = await response.json();
  return {
    ...job,
    description: buildWantedDescription(data.job?.detail) || job.description,
    experience: formatWantedExperience(data.job || {}) || job.experience,
  };
}

/**
 * Fills description and experience from each job's detail endpoint, because
 * the list endpoint carries neither. Only the first `limit` jobs are fetched,
 * `concurrency` at a time; a failing detail request keeps the list job.
 * @param {string} session
 * @param {PlatformJob[]} jobs
 * @param {{ limit?: number; concurrency?: number }} [options]
 * @returns {Promise<PlatformJob[]>}
 */
export async function enrichWantedJobs(session, jobs, options = {}) {
  const limit = options.limit ?? WANTED_DETAIL_LIMIT;
  const concurrency = options.concurrency ?? WANTED_DETAIL_CONCURRENCY;
  const enriched = jobs.slice();
  const total = Math.min(limit, jobs.length);
  let next = 0;

  async function worker() {
    while (next < total) {
      const index = next++;
      try {
        enriched[index] = await enrichWantedJob(session, jobs[index]);
      } catch (error) {
        console.warn(
          `[wanted-search] detail for ${jobs[index].id} failed: ${/** @type {Error} */ (error)?.message || error}`
        );
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return enriched;
}
