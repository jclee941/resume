import { normalizeError } from '@resume/shared/errors';
import { appendDecisionTrace } from './decision-trace.js';

/**
 * @typedef {{
 *   env: Record<string, unknown>;
 *   clients: {
 *     wanted: {
 *       setCookies(cookies: unknown): void;
 *     };
 *     [key: string]: unknown;
 *   };
 *   getWantedSession: (env: Record<string, unknown>) => Promise<unknown>;
 * }} PrimeWantedSessionOptions
 *
 * @typedef {{ jobs?: Array<Record<string, unknown>>; [key: string]: unknown }} PlatformResult
 *
 * @typedef {import('../../workflows/application/matching-config.js').MatchingConfig} SearchProfile
 *
 * WantedAPI keeps searchJobs(filters) for category browsing and searches keywords
 * with searchByKeyword; the other dashboard clients search with (keyword, options).
 * @typedef {{
 *   searchJobs(keyword: string, options: { limit: number; profile: SearchProfile }): Promise<PlatformResult>;
 * } | {
 *   searchByKeyword(keyword: string, options: { limit: number }): Promise<PlatformResult>;
 * }} PlatformClient
 *
 * @typedef {import('./job-selection.js').SearchResults} SearchJobResults
 *
 * @typedef {{
 *   clients: Record<string, PlatformClient>;
 *   activePlatforms: string[];
 *   searchKeywords: string[];
 *   searchResults: SearchJobResults;
 *   profile: SearchProfile;
 * }} SearchPlatformJobsOptions
 */

/**
 * @param {PrimeWantedSessionOptions} options
 */
export async function primeWantedSession({ env, clients, getWantedSession }) {
  const wantedCookies = await getWantedSession(env);
  if (wantedCookies) {
    clients.wanted.setCookies(wantedCookies);
  }
}

/**
 * @param {SearchPlatformJobsOptions} options
 */
export async function searchPlatformJobs({
  clients,
  activePlatforms,
  searchKeywords,
  searchResults,
  profile,
}) {
  const allJobs = [];
  const seen = new Set();

  for (const platform of activePlatforms) {
    const client = clients[platform];
    searchResults.byPlatform[platform] = {
      searched: 0,
      matched: 0,
      applied: 0,
    };

    for (const keyword of searchKeywords.slice(0, 5)) {
      try {
        searchResults.searchAttempts++;
        const result = await searchPlatformKeyword(client, keyword, profile);
        const jobs = /** @type {Array<Record<string, unknown>>} */ (result.jobs || result || []);

        for (const job of jobs) {
          const uniqueId = `${job.source || platform}_${job.sourceId || job.id}`;
          if (!seen.has(uniqueId)) {
            seen.add(uniqueId);
            allJobs.push(
              appendDecisionTrace(
                {
                  ...job,
                  source: platform,
                  keyword,
                },
                {
                  stage: 'discovered',
                  outcome: 'included',
                  reason: 'search_result',
                  platform,
                  keyword,
                }
              )
            );
            searchResults.byPlatform[platform].searched++;
          }
        }
      } catch (err) {
        const normalized = normalizeError(err, {
          handler: 'AutoApply',
          action: 'search',
          platform,
          keyword,
        });
        const sanitizedMessage = sanitizeSearchError(normalized.message);
        console.error(`[AutoApply] ${platform} search failed for "${keyword}":`, sanitizedMessage);
        searchResults.errors++;
        searchResults.searchFailures++;
        searchResults.errorDetails.push({
          platform,
          keyword,
          message: sanitizedMessage,
          errorCode: normalized.errorCode,
        });
      }
    }
  }

  return allJobs;
}

/**
 * @param {PlatformClient} client
 * @param {string} keyword
 * @param {SearchProfile} profile
 * @returns {Promise<PlatformResult>}
 */
function searchPlatformKeyword(client, keyword, profile) {
  if ('searchByKeyword' in client) {
    return client.searchByKeyword(keyword, { limit: 20 });
  }
  return client.searchJobs(keyword, { limit: 20, profile });
}

/**
 * @param {unknown} [message]
 * @returns {string}
 */
function sanitizeSearchError(message) {
  return String(message || 'Unknown search error')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted-token]')
    .replace(
      /\b(authorization|cookie|set-cookie|password|token|api[_-]?key)\b\s*[:=]\s*[^,\n]+/gi,
      '$1=[redacted]'
    )
    .slice(0, 200);
}
