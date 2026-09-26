const DEFAULT_RETRYABLE_CODES = ['ETIMEDOUT', 'ETIMEOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'];

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @typedef {Object} HttpError
 * @property {string} [name]
 * @property {string} [code]
 * @property {number} [status]
 * @property {number|string} [retry_after]
 * @property {{ retry_after?: number | string }} [parameters]
 * @property {{
 *   status?: number,
 *   data?: {
 *     retry_after?: number | string,
 *     parameters?: {
 *       retry_after?: number | string
 *     }
 *   }
 * }} [response]
 */

/**
 * @param {HttpError | null | undefined} error
 * @returns {number | null}
 */
function getHttpStatus(error) {
  return error?.response?.status ?? error?.status ?? null;
}

/**
 * @param {HttpError | null | undefined} error
 * @returns {number | null}
 */
export function parseRetryAfter(error) {
  const retryAfter =
    error?.response?.data?.parameters?.retry_after ??
    error?.response?.data?.retry_after ??
    error?.parameters?.retry_after ??
    error?.retry_after ??
    null;

  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds;
}

/**
 * @param {HttpError | null | undefined} error
 * @param {string[]} [retryableCodes]
 * @returns {boolean}
 */
export function isRetryableHttpError(error, retryableCodes = DEFAULT_RETRYABLE_CODES) {
  if (!error) {
    return false;
  }

  const code = error?.code;
  if (code && retryableCodes.includes(code)) {
    return true;
  }

  const status = getHttpStatus(error);
  if (status === 429) {
    return true;
  }

  if (status !== null && status >= 500 && status < 600) {
    return true;
  }

  if (status !== null && status >= 400 && status < 500) {
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
 * @typedef {Object} HttpRetryOptions
 * @property {number} [maxRetries]
 * @property {number} [baseDelay]
 * @property {number} [maxDelay]
 * @property {string[]} [retryableCodes]
 * @property {(error: unknown) => boolean} [shouldRetry]
 */

/**
 * @template T
 * @param {() => Promise<T> | T} fn
 * @param {HttpRetryOptions} [options]
 * @returns {Promise<T>}
 */
export async function withHttpRetry(fn, options = {}) {
  const {
    maxRetries = 4,
    baseDelay = 1000,
    maxDelay = 30000,
    retryableCodes = DEFAULT_RETRYABLE_CODES,
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

      if (!isRetryableHttpError(/** @type {HttpError} */ (error), retryableCodes)) {
        throw error;
      }

      if (!shouldRetry(error)) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 1001);
      const exponential = baseDelay * 2 ** attempt;
      let delay = Math.min(maxDelay, exponential + jitter);

      const retryAfterSeconds = parseRetryAfter(/** @type {HttpError} */ (error));
      if (retryAfterSeconds !== null) {
        delay = Math.min(maxDelay, Math.max(delay, retryAfterSeconds * 1000));
      }

      await sleep(delay);
      attempt += 1;
    }
  }
}
