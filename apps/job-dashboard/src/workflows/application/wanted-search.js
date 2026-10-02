import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { refreshWantedSession } from '../../handlers/wanted/mint-session.js';
import { readPlatformSession } from '../../services/platform-session.js';
import { enrichWantedJobs, formatWantedExperience } from './wanted-detail.js';

const MAX_WANTED_KEYWORDS = 5;
const WANTED_PAGE_SIZE = 20;

/**
 * @typedef {import('./platforms.js').PlatformJob} PlatformJob
 * @typedef {import('./platforms.js').PlatformSearchContext} PlatformSearchContext
 * @typedef {import('./platforms.js').PlatformSearchCriteria} PlatformSearchCriteria
 */

/**
 * @typedef {import('./wanted-detail.js').WantedExperienceRange & {
 *   id: string | number;
 *   company?: { name?: string };
 *   position?: string;
 *   address?: { location?: string };
 * }} WantedApiRawJob
 */

/**
 * @param {PlatformSearchCriteria} criteria
 * @returns {string[]}
 */
function wantedKeywords(criteria) {
  if (!Array.isArray(criteria.keywords)) return [];
  const trimmed = criteria.keywords
    .filter((keyword) => typeof keyword === 'string')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  return [...new Set(trimmed)].slice(0, MAX_WANTED_KEYWORDS);
}

/**
 * Wanted's /api/v4/jobs answers HTTP 422 ("country: Missing data for required
 * field") without `country`, and filters regions by `locations`.
 * @param {string} session
 * @param {string | undefined} keyword
 * @param {string | undefined} location
 * @returns {Promise<PlatformJob[]>}
 */
async function queryWanted(session, keyword, location) {
  const params = new URLSearchParams({
    country: 'kr',
    job_sort: 'job.latest_order',
    years: '-1',
    locations: location || 'all',
    limit: String(WANTED_PAGE_SIZE),
    offset: '0',
  });
  if (keyword) params.append('query', keyword);
  const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs?${params}`, {
    headers: { Cookie: session, 'User-Agent': DEFAULT_USER_AGENT },
  });
  if (!response.ok) throw new Error(`Wanted API error: ${response.status}`);
  /** @type {{ data?: WantedApiRawJob[] }} */
  const data = await response.json();
  return (data.data || []).map((job) => ({
    id: `wanted-${job.id}`,
    company: job.company?.name || 'Unknown',
    position: job.position || 'Unknown',
    url: `https://www.wanted.co.kr/wd/${job.id}`,
    location: job.address?.location || '',
    experience: formatWantedExperience(job),
    description: '',
  }));
}

/**
 * The KV Wanted session, minted when KV has none: it lives 12 hours from the daily 21:00 UTC
 * refresh, so a run started at another time of day would otherwise find none.
 * @param {PlatformSearchContext['env']} env
 * @returns {Promise<string>}
 */
async function wantedSession(env) {
  const stored = await readPlatformSession(env, 'wanted');
  if (stored) return stored;
  const refreshed = await refreshWantedSession(
    /** @type {Parameters<typeof refreshWantedSession>[0]} */ (env)
  );
  if (!refreshed.ok) throw new Error(`Wanted session refresh failed: ${refreshed.error}`);
  const minted = await readPlatformSession(env, 'wanted');
  if (!minted) throw new Error('No Wanted session after refresh');
  return minted;
}

/**
 * Searches Wanted once per configured keyword (sequentially) and merges the
 * results by job id in first-seen order, then enriches them with their detail
 * text (the list endpoint has no description). Without `criteria.keywords` it runs
 * the single `criteria.keyword` query. A failing keyword is logged and skipped;
 * the first error is thrown only when every query fails.
 * @param {PlatformSearchContext} ctx
 * @param {PlatformSearchCriteria} criteria
 * @returns {Promise<PlatformJob[]>}
 */
export async function searchWanted(ctx, criteria) {
  const session = await wantedSession(ctx.env);
  const keywords = wantedKeywords(criteria);
  if (keywords.length === 0) {
    const jobs = await queryWanted(session, criteria.keyword, criteria.location);
    return enrichWantedJobs(session, jobs);
  }

  /** @type {Map<string, PlatformJob>} */
  const merged = new Map();
  /** @type {unknown[]} */
  const errors = [];
  for (const keyword of keywords) {
    try {
      for (const job of await queryWanted(session, keyword, criteria.location)) {
        if (!merged.has(job.id)) merged.set(job.id, job);
      }
    } catch (error) {
      errors.push(error);
      console.warn(
        `[wanted-search] query for "${keyword}" failed: ${/** @type {Error} */ (error)?.message || error}`
      );
    }
  }
  if (errors.length === keywords.length) throw errors[0];
  return enrichWantedJobs(session, [...merged.values()]);
}
