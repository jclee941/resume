/**
 * @fileoverview Reads the owner's Wanted application history over HTTP with the KV session
 * cookie. `/api/v4/applications` requires a `status` filter (422 without it) and only accepts
 * `complete | pass | hire | reject`, so every status is paged separately; `total` in the response
 * is not a grand total, `links.next` marks the last page.
 * @module services/application-history/wanted-adapter
 */
import { readPlatformSession } from '../platform-session.js';
import { HistorySyncError } from './history-types.js';

export const WANTED_APPLICATIONS_URL = 'https://www.wanted.co.kr/api/v4/applications';
const PAGE_SIZE = 50;
const MAX_PAGES_PER_STATUS = 40;
const REQUEST_TIMEOUT_MS = 10_000;

/** Wanted status filter -> canonical application status. */
const STATUS_BY_FILTER = {
  complete: 'applied',
  pass: 'in_progress',
  hire: 'offer',
  reject: 'rejected',
};

/**
 * @typedef {{
 *   id?: number | string;
 *   status?: string;
 *   apply_time?: string | null;
 *   read_time?: string | null;
 *   company_name?: string;
 *   position?: string;
 *   job?: { id?: number | string } | null;
 * }} WantedApplicationItem
 *
 * @typedef {(url: string, init?: RequestInit) => Promise<Response>} Fetcher
 */

/**
 * @param {WantedApplicationItem} item
 * @param {keyof typeof STATUS_BY_FILTER} filter
 * @returns {import('./history-types.js').HistoryRecord | null}
 */
export function toWantedRecord(item, filter) {
  const wantedJobId = item?.job?.id;
  if (wantedJobId === undefined || wantedJobId === null || wantedJobId === '') return null;
  const status = filter === 'complete' && item.read_time ? 'viewed' : STATUS_BY_FILTER[filter];
  return {
    source: 'wanted',
    jobId: `wanted-${wantedJobId}`,
    company: item.company_name?.trim() || 'Unknown',
    position: item.position?.trim() || 'Unknown',
    url: `https://www.wanted.co.kr/wd/${wantedJobId}`,
    appliedAt: item.apply_time || null,
    status,
  };
}

/**
 * @param {Fetcher} fetcher
 * @param {string} cookie
 * @param {keyof typeof STATUS_BY_FILTER} status
 * @param {number} offset
 * @returns {Promise<{ items: WantedApplicationItem[]; hasNext: boolean }>}
 */
async function fetchPage(fetcher, cookie, status, offset) {
  const url = `${WANTED_APPLICATIONS_URL}?status=${status}&limit=${PAGE_SIZE}&offset=${offset}`;
  const response = await fetcher(url, {
    headers: { Accept: 'application/json', Cookie: cookie, Referer: 'https://www.wanted.co.kr/' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401 || response.status === 403) {
    throw new HistorySyncError(
      'SESSION_EXPIRED',
      `Wanted rejected the session (${response.status})`
    );
  }
  if (!response.ok) {
    throw new HistorySyncError(
      'UPSTREAM_ERROR',
      `Wanted returned ${response.status} for status=${status}`
    );
  }
  const payload = /** @type {{ data?: unknown; links?: { next?: unknown } }} */ (
    await response.json()
  );
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return { items, hasNext: Boolean(payload?.links?.next) };
}

/**
 * @param {Parameters<typeof readPlatformSession>[0]} env
 * @param {{ fetcher?: Fetcher }} [options]
 * @returns {Promise<import('./history-types.js').HistoryRecord[]>}
 */
export async function fetchWantedHistory(env, { fetcher = fetch } = {}) {
  const cookie = await readPlatformSession(env, 'wanted');
  if (!cookie)
    throw new HistorySyncError('SESSION_MISSING', 'No Wanted session in KV (auth:wanted)');
  /** @type {import('./history-types.js').HistoryRecord[]} */
  const records = [];
  for (const status of /** @type {Array<keyof typeof STATUS_BY_FILTER>} */ (
    Object.keys(STATUS_BY_FILTER)
  )) {
    for (let page = 0, offset = 0; page < MAX_PAGES_PER_STATUS; page += 1, offset += PAGE_SIZE) {
      const { items, hasNext } = await fetchPage(fetcher, cookie, status, offset);
      for (const item of items) {
        const record = toWantedRecord(item, status);
        if (record) records.push(record);
      }
      if (!hasNext || items.length === 0) break;
    }
  }
  return records;
}
