/**
 * Generic retry primitives — SSOT-039 / issue #48.
 *
 * `withRetry(fn, options)` retries a function with exponential backoff and
 * jitter. Honors `Retry-After` headers via `parseRetryAfter()`. Decides
 * retryability via `isRetryableError()`.
 *
 * For HTTP-specific retry (axios/fetch error shapes) see `./http-retry.js`.
 * For circuit-breaker-aware retry (with metrics/state) see
 * `./circuit-breaker.js` and `apps/job-server/src/shared/utils/retry.js`
 * (domain-specific apply retry).
 *
 * This module is the canonical home for the simple "retry with backoff" loop
 * that previously lived duplicated in:
 *   - apps/job-dashboard/src/utils/retry.js
 *   - apps/job-server/src/shared/utils/retry.js (sophisticated; not migrated)
 */

const DEFAULT_RETRYABLE_ERRORS = ['ETIMEDOUT', 'ETIMEOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHttpStatus(error) {
  return error?.response?.status ?? error?.status ?? null;
}

/**
 * Extract a numeric retry-after value (in seconds) from error metadata.
 * Returns null if no valid value is present.
 *
 * Looks at, in priority order:
 *   1. error.response.data.parameters.retry_after
 *   2. error.response.data.retry_after
 *   3. error.parameters.retry_after
 *   4. error.retry_after
 *
 * @param {unknown} error
 * @returns {number|null}
 */
export function parseRetryAfter(error) {
  const retryAfter =
    error?.response?.data?.parameters?.retry_after ??
    error?.response?.data?.retry_after ??
    error?.parameters?.retry_after ??
    error?.retry_after ??
    null;

  if (retryAfter === null || retryAfter === undefined) {
    return null;
  }
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds;
}

/**
 * Decide whether `error` is retryable based on:
 *   - low-level error.code matching `retryableErrors` list
 *   - HTTP status: 429 retryable, 5xx retryable, 4xx not retryable
 *   - error.name / error.code naming for ValidationError / AUTH_ERROR
 *
 * @param {unknown} error
 * @param {string[]} [retryableErrors] - low-level error codes to retry on
 * @returns {boolean}
 */
export function isRetryableError(error, retryableErrors = DEFAULT_RETRYABLE_ERRORS) {
  if (!error) {
    return false;
  }

  const code = error?.code;
  if (code && retryableErrors.includes(code)) {
    return true;
  }

  const status = getHttpStatus(error);
  if (status === 429) {
    return true;
  }

  if (typeof status === 'number' && status >= 500 && status < 600) {
    return true;
  }

  if (typeof status === 'number' && status >= 400 && status < 500) {
    return false;
  }

  if (
    error?.name === 'ValidationError' ||
    error?.code === 'VALIDATION_ERROR' ||
    error?.code === 'AUTH_ERROR'
  ) {
    return false;
  }

  return false;
}

/**
 * Retry an async operation with exponential backoff + jitter.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {Object} [options]
 * @param {number} [options.maxRetries=4]
 * @param {number} [options.baseDelay=1000] - ms
 * @param {number} [options.maxDelay=30000] - ms
 * @param {string[]} [options.retryableErrors] - low-level error codes
 * @param {(error: unknown) => boolean} [options.shouldRetry] - extra gate
 * @returns {Promise<T>}
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 4,
    baseDelay = 1000,
    maxDelay = 30000,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      if (!isRetryableError(error, retryableErrors)) {
        throw error;
      }
      if (!shouldRetry(error)) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 1001);
      const exponential = baseDelay * 2 ** attempt;
      let delay = Math.min(maxDelay, exponential + jitter);

      const retryAfterSeconds = parseRetryAfter(error);
      if (retryAfterSeconds !== null) {
        delay = Math.min(maxDelay, Math.max(delay, retryAfterSeconds * 1000));
      }

      await sleep(delay);
      attempt += 1;
    }
  }
}

export const RETRY_DEFAULT_RETRYABLE_ERRORS = DEFAULT_RETRYABLE_ERRORS;
