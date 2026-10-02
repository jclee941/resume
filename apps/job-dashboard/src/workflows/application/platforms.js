import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import {
  ATS_DRY_RUN_PLATFORMS,
  DEFAULT_APPLICATION_PLATFORMS,
  createAtsDryRunClient,
  isAtsDryRunPlatform,
  normalizeApplicationPlatforms,
  supportedApplicationPlatforms,
} from './application-platform-catalog.js';
import { searchRemember } from './remember-search.js';
import { searchWanted } from './wanted-search.js';

export { searchRemember, searchWanted };
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
