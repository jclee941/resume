/**
 * @typedef {Object} AtsFetchCriteria
 * @property {string | null | undefined} [boardToken]
 * @property {string | null | undefined} [company]
 * @property {string | null | undefined} [apiKey]
 */

/**
 * @typedef {(criteria: AtsFetchCriteria) => Promise<unknown[]>} AtsPostingFetcher
 */

/**
 * @param {typeof globalThis.fetch} fetch
 * @returns {AtsPostingFetcher | null}
 */
export function createGreenhousePostingFetcher(fetch) {
  if (!fetch) return null;

  return async ({ boardToken, company }) => {
    const token = normalizeBoardToken(boardToken ?? company);
    if (!token) return [];

    const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
    const payload = /** @type {{ jobs?: unknown[] }} */ (
      await fetchJson(fetch, url, { method: 'GET' })
    );

    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  };
}

/**
 * @param {typeof globalThis.fetch} fetch
 * @returns {AtsPostingFetcher | null}
 */
export function createLeverPostingFetcher(fetch) {
  if (!fetch) return null;

  return async ({ boardToken, company }) => {
    const token = normalizeBoardToken(boardToken ?? company);
    if (!token) return [];

    const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
    const payload = /** @type {unknown[] | { postings?: unknown[] }} */ (
      await fetchJson(fetch, url, { method: 'GET' })
    );

    if (Array.isArray(payload)) return payload;
    return Array.isArray(payload?.postings) ? payload.postings : [];
  };
}

/**
 * @param {typeof globalThis.fetch} fetch
 * @returns {AtsPostingFetcher | null}
 */
export function createAshbyPostingFetcher(fetch) {
  if (!fetch) return null;

  return async ({ boardToken, company, apiKey }) => {
    const token = normalizeBoardToken(boardToken ?? company);
    if (!token) return [];

    const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
    /** @type {HeadersInit} */
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const payload = /** @type {unknown[] | { jobs?: unknown[] }} */ (
      await fetchJson(fetch, url, { method: 'GET', headers })
    );

    if (Array.isArray(payload)) return payload;
    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  };
}

/**
 * @param {typeof globalThis.fetch} fetch
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<unknown>}
 */
async function fetchJson(fetch, url, init) {
  const response = await fetch(url, init);

  if (!response?.ok) return [];
  return response.json();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeBoardToken(value) {
  const token = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!token) return '';

  return encodeURIComponent(token);
}
