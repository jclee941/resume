import { withRetry } from '@resume/shared/retry';

import { REMEMBER_BROWSER_FETCH_FAILED } from './remember-fetch.js';

const BROWSER_FETCH_RETRY = { maxRetries: 1, retryableErrors: [REMEMBER_BROWSER_FETCH_FAILED] };

/**
 * Runs a Remember call once more when its browser fetch failed: a Browser Rendering session
 * sometimes fails the in-page fetch where a fresh session succeeds. Only for calls that are safe
 * to repeat, so never for the apply request itself.
 * @template T
 * @param {() => Promise<T>} call
 * @returns {Promise<T>}
 */
export function withBrowserFetchRetry(call) {
  return withRetry(call, BROWSER_FETCH_RETRY);
}
