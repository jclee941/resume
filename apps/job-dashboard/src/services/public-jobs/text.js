/**
 * @fileoverview Shared helpers for the public-sector posting adapters (잡알리오, 클린아이 잡플러스,
 * 나라일터): HTML-to-text, Korean-calendar dates, bounded-concurrency fetching. Workers have no DOM,
 * so pages are reduced to text with regular expressions, and Node tests run the same code.
 * @module services/public-jobs/text
 */
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

const REQUEST_TIMEOUT_MS = 15_000;
const RETRIES = 1;
const KST_OFFSET_MS = 9 * 3_600_000;

/** @type {Record<string, string>} */
const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
};

/**
 * @typedef {(url: string, init?: RequestInit) => Promise<Response>} Fetcher
 */

/**
 * @param {string | null | undefined} html
 * @returns {string} visible text with tags removed and whitespace collapsed
 */
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#0?39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {Date} date
 * @returns {string} the Korean (UTC+9) calendar date as YYYY-MM-DD
 */
export function kstDate(date) {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} days
 * @returns {string} YYYY-MM-DD `days` earlier
 */
export function daysBefore(isoDate, days) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * @param {string | null | undefined} text "26.10.22", "2026.10.22" or "2026-10-22", possibly
 *   followed by other text such as "D-6"
 * @returns {string | null} YYYY-MM-DD
 */
export function toIsoDate(text) {
  const match = /(\d{4}|\d{2})[.-](\d{1,2})[.-](\d{1,2})/.exec(text ?? '');
  if (!match) return null;
  const year = match[1].length === 2 ? `20${match[1]}` : match[1];
  return `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

/**
 * @param {string | null} isoDate a Korean calendar date (YYYY-MM-DD)
 * @returns {string | null} the end of that Korean day as a UTC ISO timestamp
 */
export function deadlineIso(isoDate) {
  if (!isoDate) return null;
  return new Date(`${isoDate}T23:59:59+09:00`).toISOString().replace('.000Z', 'Z');
}

/**
 * @param {Record<string, string | null | undefined>} fields
 * @param {number} [limit] characters kept per value
 * @returns {string} "label: value" pairs joined with " | ", empty values left out
 */
export function summarize(fields, limit = 300) {
  return Object.entries(fields)
    .filter(([, value]) => Boolean(value && value.trim()))
    .map(([label, value]) => `${label}: ${String(value).trim().slice(0, limit)}`)
    .join(' | ');
}

/**
 * GETs `url`, or POSTs `form` as application/x-www-form-urlencoded when given. A timeout, network
 * error, 429 or 5xx is retried once, so one slow page does not fail a whole source.
 * @param {Fetcher} fetcher
 * @param {string} url
 * @param {Record<string, string>} [form]
 * @returns {Promise<string>}
 */
export async function fetchText(fetcher, url, form) {
  /** @type {unknown} */
  let failure;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetcher(url, {
        method: form ? 'POST' : 'GET',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
          ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: form ? new URLSearchParams(form).toString() : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return await response.text();
      failure = new Error(`${new URL(url).hostname} answered ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}

/**
 * Runs `task` over `items` with at most `limit` in flight; results keep the input order.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} task
 * @returns {Promise<PromiseSettledResult<R>[]>}
 */
export async function mapSettled(items, limit, task) {
  /** @type {PromiseSettledResult<R>[]} */
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * @template T
 * @param {PromiseSettledResult<T | null>[]} settled
 * @returns {{ values: T[]; failed: number }} fulfilled non-null values and the rejection count
 */
export function partitionSettled(settled) {
  /** @type {T[]} */
  const values = [];
  let failed = 0;
  for (const result of settled) {
    if (result.status === 'rejected') failed += 1;
    else if (result.value !== null) values.push(result.value);
  }
  return { values, failed };
}
