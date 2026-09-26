import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { resolveWantedSession } from './session.js';

/**
 * @typedef {{
 *   keyword?: unknown;
 *   keywords?: unknown;
 *   limit?: unknown;
 *   offset?: unknown;
 *   location?: string;
 *   [key: string]: unknown;
 * }} CrawlCriteria
 *
 * @typedef {import('./session.js').SessionEnv & {
 *   SESSIONS: { get(key: string): Promise<string | null> };
 * }} CrawlerEnv
 *
 * @typedef {{
 *   id: string;
 *   company: string;
 *   position: string;
 *   url: string;
 *   location: string;
 *   experience: string | number;
 * }} CrawledPosting
 *
 * @typedef {{ jobs: CrawledPosting[]; error?: string }} CrawlResult
 *
 * @typedef {{
 *   id: string | number;
 *   company?: { name?: string };
 *   position?: string;
 *   address?: { location?: string };
 *   years?: string | number;
 * }} WantedJobPosting
 *
 * @typedef {{
 *   id?: string | number;
 *   organization?: { name?: string };
 *   company?: { name?: string };
 *   title?: string;
 *   location?: { name?: string };
 *   address?: { full_location?: string };
 *   career_period?: string | number;
 * }} RememberJobPosting
 */

/**
 * @param {CrawlCriteria} [criteria]
 * @returns {string}
 */
function normalizeKeyword(criteria = {}) {
  for (const candidate of [criteria?.keyword, criteria?.keywords]) {
    const values = Array.isArray(candidate) ? candidate : [candidate];
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return '';
}

/**
 * Dispatch crawling to the selected platform adapter.
 *
 * @param {CrawlerEnv} env
 * @param {string} platform
 * @param {CrawlCriteria} criteria
 * @returns {Promise<CrawlResult>}
 */
export async function crawlPlatform(env, platform, criteria) {
  /** @type {Record<string, () => Promise<CrawlResult>>} */
  const clients = {
    wanted: () => crawlWanted(env, criteria),
    linkedin: () => crawlLinkedIn(criteria),
    remember: () => crawlRemember(criteria),
  };

  const crawler = clients[platform];
  if (!crawler) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  return await crawler();
}

/**
 * @param {CrawlerEnv} env
 * @param {CrawlCriteria} [criteria]
 * @returns {Promise<CrawlResult>}
 */
export async function crawlWanted(env, criteria = {}) {
  const session = await env.SESSIONS.get('auth:wanted');
  if (!session) {
    return { jobs: [], error: 'Authentication required: Wanted session missing' };
  }

  const { cookies, sessionValid } = await resolveWantedSession(env, session);
  if (!sessionValid) {
    return { jobs: [], error: 'Authentication required: invalid Wanted session' };
  }

  try {
    const keyword = normalizeKeyword(criteria);
    const params = new URLSearchParams({
      country: 'kr',
      query: keyword,
      limit: String(criteria?.limit ?? 10),
      offset: String(criteria?.offset ?? 0),
      years: '-1',
      locations: criteria?.location || 'all',
      job_sort: 'job.latest_order',
    });
    const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs?${params}`, {
      headers: {
        Cookie: cookies,
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      return { jobs: [], error: `API error: ${response.status}` };
    }

    /** @type {{ data?: WantedJobPosting[] }} */
    const data = await response.json();
    return {
      jobs: (data.data || []).map((job) => ({
        id: `wanted-${job.id}`,
        company: job.company?.name || 'Unknown',
        position: job.position || 'Unknown',
        url: `https://www.wanted.co.kr/wd/${job.id}`,
        location: job.address?.location || '',
        experience: job.years || '',
      })),
    };
  } catch (error) {
    return { jobs: [], error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * @param {CrawlCriteria} [criteria]
 * @returns {Promise<CrawlResult>}
 */
export async function crawlLinkedIn(criteria = {}) {
  try {
    const keyword = encodeURIComponent(normalizeKeyword(criteria));
    const location = encodeURIComponent(criteria?.location || '');
    const response = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=${location}&f_TPR=r604800&position=0&pageNum=0`,
      {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      return { jobs: [], error: `API error: ${response.status}` };
    }

    const html = await response.text();
    const jobPattern =
      /<div[^>]*class="[^"]*base-card[^"]*"[^>]*data-entity-urn="urn:li:jobPosting:(\d+)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>[\s\S]*?<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
    const jobs = [];

    for (;;) {
      const match = jobPattern.exec(html);
      if (match === null) break;

      const sourceId = (match[1] || '').trim();
      const position = (match[2] || '').trim();
      const company = (match[3] || '').trim();
      if (!sourceId) continue;

      jobs.push({
        id: `linkedin-${sourceId}`,
        company,
        position,
        url: `https://www.linkedin.com/jobs/view/${sourceId}`,
        location: criteria?.location || '',
        experience: '',
      });
    }

    return { jobs };
  } catch (error) {
    return { jobs: [], error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * @param {CrawlCriteria} [criteria]
 * @returns {Promise<CrawlResult>}
 */
export async function crawlRemember(criteria = {}) {
  try {
    const keyword = normalizeKeyword(criteria);
    const headers = {
      Accept: 'application/json',
      Origin: 'https://career.rememberapp.co.kr',
      Referer: 'https://career.rememberapp.co.kr/job/postings',
      'User-Agent': DEFAULT_USER_AGENT,
    };

    const response = keyword
      ? await fetch('https://career-api.rememberapp.co.kr/job_postings/search', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `page=1&per=20&search=${encodeURIComponent(keyword)}`,
        })
      : await fetch(
          'https://career-api.rememberapp.co.kr/job_postings/curations?tab=STEP_UP&page=1&per=20',
          {
            method: 'GET',
            headers,
          }
        );

    if (!response.ok) {
      return { jobs: [], error: `API error: ${response.status}` };
    }

    const data = await response.json();
    /** @type {RememberJobPosting[]} */
    const rawJobs = Array.isArray(data?.data?.job_postings)
      ? data.data.job_postings
      : Array.isArray(data?.data)
        ? data.data
        : [];

    return {
      jobs: rawJobs
        .filter((job) => job?.id)
        .map((job) => ({
          id: `remember-${job.id}`,
          company: job.organization?.name || job.company?.name || '',
          position: job.title || '',
          url: `https://career.rememberapp.co.kr/job/posting/${job.id}`,
          location: job.location?.name || job.address?.full_location || '',
          experience: job.career_period || '',
        })),
    };
  } catch (error) {
    return { jobs: [], error: error instanceof Error ? error.message : String(error) };
  }
}
