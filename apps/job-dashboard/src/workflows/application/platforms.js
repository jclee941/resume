import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession } from '../../services/platform-session.js';
import {
  ATS_DRY_RUN_PLATFORMS,
  DEFAULT_APPLICATION_PLATFORMS,
  createAtsDryRunClient,
  isAtsDryRunPlatform,
  normalizeApplicationPlatforms,
  supportedApplicationPlatforms,
} from './application-platform-catalog.js';

export {
  ATS_DRY_RUN_PLATFORMS,
  DEFAULT_APPLICATION_PLATFORMS,
  createAtsDryRunClient,
  isAtsDryRunPlatform,
  normalizeApplicationPlatforms,
  supportedApplicationPlatforms,
};

/**
 * @typedef {{
 *   id: string;
 *   company?: string | null;
 *   position?: string;
 *   url?: string;
 *   sourceUrl?: string;
 *   location?: string;
 *   experience?: string | number;
 *   description?: string;
 *   [key: string]: unknown;
 * }} PlatformJob
 */

/**
 * @typedef {{
 *   keyword?: string;
 *   keywords?: string[];
 *   location?: string;
 *   atsStub?: boolean;
 *   atsClients?: Record<string, Record<string, unknown>>;
 *   [key: string]: unknown;
 * }} PlatformSearchCriteria
 */

/**
 * @typedef {{
 *   env: {
 *     ENCRYPTION_KEY?: string;
 *     SESSIONS?: { get(key: string): Promise<string | null> };
 *     [key: string]: unknown;
 *   };
 *   [key: string]: unknown;
 * }} PlatformSearchContext
 */

/**
 * @typedef {{
 *   id: string | number;
 *   company?: { name?: string };
 *   position?: string;
 *   address?: { location?: string };
 *   years?: string | number;
 *   detail?: { description?: string };
 * }} WantedApiRawJob
 */

/**
 * @typedef {{
 *   id: string | number;
 *   organization?: { name?: string };
 *   company?: { name?: string };
 *   title?: string;
 *   location?: { name?: string };
 * }} RememberApiRawJob
 */

/**
 * @param {PlatformSearchContext} ctx
 * @param {string} platform
 * @param {PlatformSearchCriteria} criteria
 * @returns {Promise<PlatformJob[]>}
 */
export async function searchJobs(ctx, platform, criteria) {
  switch (platform) {
    case 'wanted':
      return searchWanted(ctx, criteria);
    case 'linkedin':
      return searchLinkedIn(ctx, criteria);
    case 'remember':
      return searchRemember(ctx, criteria);
    default:
      if (criteria?.atsStub && isAtsDryRunPlatform(platform)) {
        return searchAtsDryRun(platform, criteria);
      }
      return [];
  }
}

/**
 * @param {string} platform
 * @param {PlatformSearchCriteria} criteria
 * @returns {Promise<PlatformJob[]>}
 */
async function searchAtsDryRun(platform, criteria) {
  const client = createAtsDryRunClient(platform, criteria?.atsClients?.[platform] ?? {});
  if (!client) return [];
  const keyword = Array.isArray(criteria?.keywords) ? criteria.keywords[0] : criteria?.keyword;
  const result = await client.searchJobs(keyword || 'security');
  return result.jobs;
}

/**
 * @param {PlatformSearchContext} ctx
 * @param {PlatformSearchCriteria} criteria
 * @returns {Promise<PlatformJob[]>}
 */
export async function searchWanted(ctx, criteria) {
  const session = await readPlatformSession(ctx.env, 'wanted');
  if (!session) throw new Error('No Wanted session available');
  const params = new URLSearchParams();
  if (criteria.keyword) params.append('query', criteria.keyword);
  if (criteria.location) params.append('location', criteria.location);
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
    experience: job.years || '',
    description: job.detail?.description || '',
  }));
}
/**
 * @param {PlatformSearchContext} _ctx
 * @param {PlatformSearchCriteria} criteria
 * @returns {Promise<PlatformJob[]>}
 */
export async function searchLinkedIn(_ctx, criteria) {
  const keyword = encodeURIComponent(criteria.keyword || '');
  const location = encodeURIComponent(criteria.location || '');
  const url = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
  const response = await fetch(`${url}?keywords=${keyword}&location=${location}&f_TPR=r604800`, {
    headers: { 'User-Agent': DEFAULT_USER_AGENT },
  });
  if (!response.ok) throw new Error(`LinkedIn API error: ${response.status}`);
  const html = await response.text();
  /** @type {PlatformJob[]} */
  const jobs = [];
  const pattern =
    /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title[^>]*>([^<]+)<\/[\s\S]*?base-search-card__subtitle[\s\S]*?<a[^>]*>([^<]+)</gi;
  let match = pattern.exec(html);
  while (match !== null) {
    jobs.push({
      id: `linkedin-${match[1]}`,
      position: match[2].trim(),
      company: match[3].trim(),
      url: `https://www.linkedin.com/jobs/view/${match[1]}`,
    });
    match = pattern.exec(html);
  }
  return jobs;
}
/**
 * @param {PlatformSearchContext} _ctx
 * @param {PlatformSearchCriteria} criteria
 * @returns {Promise<PlatformJob[]>}
 */
export async function searchRemember(_ctx, criteria) {
  const headers = {
    Accept: 'application/json',
    Origin: 'https://career.rememberapp.co.kr',
    Referer: 'https://career.rememberapp.co.kr/job/postings',
    'User-Agent': DEFAULT_USER_AGENT,
  };
  const response = criteria.keyword
    ? await fetch('https://career-api.rememberapp.co.kr/job_postings/search', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `page=1&per=20&search=${encodeURIComponent(criteria.keyword)}`,
      })
    : await fetch(
        'https://career-api.rememberapp.co.kr/job_postings/curations?tab=STEP_UP&page=1&per=20',
        { headers }
      );
  if (!response.ok) throw new Error(`Remember API error: ${response.status}`);
  const data = await response.json();
  /** @type {RememberApiRawJob[]} */
  const jobs = Array.isArray(data?.data?.job_postings)
    ? data.data.job_postings
    : Array.isArray(data?.data)
      ? data.data
      : [];
  return jobs
    .filter((job) => job?.id)
    .map((job) => ({
      id: `remember-${job.id}`,
      company: job.organization?.name || job.company?.name || '',
      position: job.title || '',
      url: `https://career.rememberapp.co.kr/job/posting/${job.id}`,
      location: job.location?.name || '',
    }));
}
