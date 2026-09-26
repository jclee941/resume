import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession } from '../services/platform-session.js';

/**
 * @typedef {{
 *   section: string;
 *   item: unknown;
 * }} ResumeDiffAddition
 */

/**
 * @typedef {{
 *   section: string;
 *   existing: { id: string | number };
 *   item: unknown;
 * }} ResumeDiffUpdate
 */

/**
 * @typedef {{
 *   additions: ResumeDiffAddition[];
 *   updates: ResumeDiffUpdate[];
 *   deletions?: unknown[];
 * }} ResumeDiff
 */

/**
 * @typedef {{
 *   ENCRYPTION_KEY?: string;
 *   SESSIONS?: { get(key: string): Promise<string | null> };
 *   [key: string]: unknown;
 * }} PlatformSyncEnv
 */

/**
 * @typedef {{
 *   action: string;
 *   section: string;
 *   error: string;
 * }} SyncError
 */

/**
 * @typedef {{
 *   additions: number;
 *   updates: number;
 *   deletions: number;
 *   errors: SyncError[];
 * }} SyncResults
 */

/**
 * @param {PlatformSyncEnv} env
 * @param {string} platform
 * @param {string | number} resumeId
 * @param {ResumeDiff} diff
 * @returns {Promise<{ success: boolean; error?: string; [key: string]: unknown }>}
 */
export async function syncToPlatform(env, platform, resumeId, diff) {
  /** @type {Record<string, () => Promise<{ success: boolean; error?: string; [key: string]: unknown }>>} */
  const syncers = {
    wanted: () => syncToWanted(env, resumeId, diff),
    linkedin: () => syncToLinkedIn(resumeId, diff),
    remember: () => syncToRemember(resumeId, diff),
  };

  const syncer = syncers[platform];
  if (!syncer) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }

  try {
    return await syncer();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * @param {PlatformSyncEnv} env
 * @param {string | number} resumeId
 * @param {ResumeDiff} diff
 * @returns {Promise<{ success: boolean; error?: string; additions?: number; updates?: number; deletions?: number; errors?: SyncError[] }>}
 */
export async function syncToWanted(env, resumeId, diff) {
  const session = await readPlatformSession(env, 'wanted');
  if (!session) {
    return { success: false, error: 'No Wanted session' };
  }

  /** @type {SyncResults} */
  const results = { additions: 0, updates: 0, deletions: 0, errors: [] };

  for (const add of diff.additions) {
    try {
      await wantedApiRequest('POST', `resumes/v2/${resumeId}/${add.section}`, add.item, session);
      results.additions++;
    } catch (error) {
      results.errors.push({
        action: 'add',
        section: add.section,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const update of diff.updates) {
    try {
      const id = update.existing.id;
      await wantedApiRequest(
        'PATCH',
        `resumes/v2/${resumeId}/${update.section}/${id}`,
        update.item,
        session
      );
      results.updates++;
    } catch (error) {
      results.errors.push({
        action: 'update',
        section: update.section,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    success: results.errors.length === 0,
    ...results,
  };
}

/**
 * @param {string} method
 * @param {string} path
 * @param {unknown} body
 * @param {string} session
 * @returns {Promise<unknown>}
 */
export async function wantedApiRequest(method, path, body, session) {
  const response = await fetch(`https://www.wanted.co.kr/api/chaos/${path}`, {
    method,
    headers: {
      Cookie: session,
      'Content-Type': 'application/json',
      'User-Agent': DEFAULT_USER_AGENT,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * @param {string | number} [_resumeId]
 * @param {ResumeDiff} [_diff]
 * @returns {Promise<{ success: boolean; error: string }>}
 */
export async function syncToLinkedIn(_resumeId, _diff) {
  return {
    success: false,
    error: 'LinkedIn profile sync requires browser automation — delegate to job-server',
  };
}

/**
 * @param {string | number} [_resumeId]
 * @param {ResumeDiff} [_diff]
 * @returns {Promise<{ success: boolean; error: string }>}
 */
export async function syncToRemember(_resumeId, _diff) {
  return {
    success: false,
    error: 'Remember profile sync requires browser automation — delegate to job-server',
  };
}
