/**
 * @fileoverview Reads the owner's Remember application history from the career API with the KV
 * session token (`withRememberToken` logs in again when KV has none or it expired). Each posting
 * carries one `application` whose `status` stays "applied"; the times beside it (+09:00 offsets)
 * hold `applied_at` and the employer's progress: read, reviewed, document pass, final offer,
 * rejection, and `canceled_at` once withdrawn. Pages hold up to `per` postings and a shorter page
 * is the last one.
 * @module services/application-history/remember-adapter
 */
import {
  REMEMBER_CAREER_API_URL,
  REMEMBER_CAREER_URL,
  RememberApiError,
  rememberRequest,
} from '../remember/remember-api.js';
import { withBrowserFetchRetry } from '../remember/remember-retry.js';
import { withRememberToken } from '../remember/remember-session.js';
import { HistorySyncError } from './history-types.js';

export const REMEMBER_HISTORY_URL = `${REMEMBER_CAREER_API_URL}/open_profiles/me/job_postings/application_histories`;
const PAGE_SIZE = 50;
const MAX_PAGES = 40;
const SESSION_FAILURE = /^(Remember session refresh failed|No Remember session after refresh)/;

/**
 * @typedef {{
 *   status?: string;
 *   applied_at?: string | null;
 *   first_read_at?: string | null;
 *   reviewed_at?: string | null;
 *   resume_accepted_at?: string | null;
 *   final_accepted_at?: string | null;
 *   rejected_at?: string | null;
 *   canceled_at?: string | null;
 * }} RememberApplication
 *
 * @typedef {{
 *   id?: number | string;
 *   title?: string;
 *   organization?: { name?: string } | null;
 *   application?: RememberApplication | null;
 * }} RememberHistoryPosting
 */

/**
 * The furthest stage the application reached: a withdrawal, then a rejection, a final offer, a
 * passed document review, an employer read or review, else a plain application.
 * @param {RememberApplication | null | undefined} application
 * @returns {string}
 */
export function rememberStatus(application) {
  if (application?.canceled_at) return 'withdrawn';
  if (application?.rejected_at) return 'rejected';
  if (application?.final_accepted_at) return 'offer';
  if (application?.resume_accepted_at) return 'in_progress';
  if (application?.first_read_at || application?.reviewed_at) return 'viewed';
  return 'applied';
}

/**
 * @param {string | null | undefined} value ISO string with an offset
 * @returns {string | null} UTC ISO string, or null when missing or unparseable
 */
function toUtcIso(value) {
  const date = new Date(value ?? '');
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * @param {RememberHistoryPosting} posting
 * @returns {import('./history-types.js').HistoryRecord | null}
 */
export function toRememberRecord(posting) {
  const id = posting?.id;
  if (id === undefined || id === null || id === '') return null;
  const application = posting.application;
  return {
    source: 'remember',
    jobId: `remember-${id}`,
    company: posting.organization?.name?.trim() || 'Unknown',
    position: posting.title?.trim() || 'Unknown',
    url: `${REMEMBER_CAREER_URL}/job/posting/${id}`,
    appliedAt: toUtcIso(application?.applied_at),
    status: rememberStatus(application),
  };
}

/**
 * @param {unknown} error
 * @returns {unknown}
 */
function toHistoryError(error) {
  if (error instanceof HistorySyncError) return error;
  if (error instanceof RememberApiError) {
    const code = /** @type {{ code?: unknown } | null} */ (error.body)?.code;
    return error.status === 401 || error.status === 403 || code === 'require_authorize'
      ? new HistorySyncError('SESSION_EXPIRED', `Remember rejected the session (${error.status})`)
      : new HistorySyncError('UPSTREAM_ERROR', error.message);
  }
  if (error instanceof Error && SESSION_FAILURE.test(error.message)) {
    return new HistorySyncError('SESSION_MISSING', error.message);
  }
  return error;
}

/**
 * @param {Parameters<typeof withRememberToken>[0]} env
 * @returns {Promise<import('./history-types.js').HistoryRecord[]>}
 */
export async function fetchRememberHistory(env) {
  try {
    return await withRememberToken(env, async (token, fetchImpl) => {
      /** @type {import('./history-types.js').HistoryRecord[]} */
      const records = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const url = `${REMEMBER_HISTORY_URL}?page=${page}&per=${PAGE_SIZE}`;
        const payload = await withBrowserFetchRetry(() =>
          rememberRequest(token, url, { fetchImpl })
        );
        const postings = Array.isArray(payload?.data) ? payload.data : [];
        for (const posting of postings) {
          const record = toRememberRecord(posting);
          if (record) records.push(record);
        }
        if (postings.length < PAGE_SIZE) break;
      }
      return records;
    });
  } catch (error) {
    throw toHistoryError(error);
  }
}
