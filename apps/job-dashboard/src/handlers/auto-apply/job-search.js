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
 * @typedef {Array<Record<string, unknown>> & { jobs?: Array<Record<string, unknown>> }} PlatformResult
 *
 * @typedef {{
 *   searchJobs(keyword: string, options: { limit: number; profile: unknown }): Promise<PlatformResult>;
 * }} PlatformClient
 *
 * @typedef {{
 *   searchAttempts: number;
 *   errors: number;
 *   searchFailures: number;
 *   errorDetails: Array<{
 *     platform: string;
 *     keyword: string;
 *     message: string;
 *     errorCode?: string | number;
 *   }>;
 *   byPlatform: Record<string, {
 *     searched: number;
 *     matched: number;
 *     applied: number;
 *     [key: string]: unknown;
 *   }>;
 *   [key: string]: unknown;
 * }} SearchJobResults
 *
 * @typedef {{
 *   clients: Record<string, PlatformClient>;
 *   activePlatforms: string[];
 *   searchKeywords: string[];
 *   searchResults: SearchJobResults;
 *   profile: unknown;
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
        const result = await client.searchJobs(keyword, { limit: 20, profile });
        const jobs = result.jobs || result || [];

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
