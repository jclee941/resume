import { AppError } from './app-error.js';
import { ErrorCodes } from './error-codes.js';

/**
 * @typedef {{
 *   code?: string;
 *   statusCode?: number;
 *   metadata?: Record<string, unknown>;
 *   cause?: unknown;
 *   retryable?: boolean;
 *   platform?: string | null;
 * }} ApplyErrorOptions
 */

/**
 * @typedef {{
 *   metadata?: Record<string, unknown>;
 *   cause?: unknown;
 *   platform?: string | null;
 * }} SubApplyErrorOptions
 */

/**
 * @typedef {SubApplyErrorOptions & {
 *   retryAfterMs?: number | null;
 * }} RateLimitErrorOptions
 */

/**
 * @typedef {{
 *   message?: string;
 *   code?: unknown;
 *   statusCode?: number | string;
 *   status?: number | string;
 *   retryAfterMs?: number | string;
 *   retryAfter?: number | string;
 *   name?: string;
 *   cause?: { code?: unknown; [key: string]: unknown } | null;
 *   retryable?: boolean;
 *   [key: string]: unknown;
 * }} ErrorLike
 */

export class ApplyError extends AppError {
  /**
   * @param {string} [message]
   * @param {ApplyErrorOptions} [options]
   */
  constructor(message = 'Apply flow failed', options = {}) {
    const {
      code = ErrorCodes.PLATFORM_APPLY_FAILED,
      statusCode = 500,
      metadata = {},
      cause = null,
      retryable = false,
      platform = null,
    } = options;

    super(
      message,
      code,
      statusCode,
      { ...metadata, platform, retryable },
      /** @type {Error | null} */ (cause)
    );
    this.name = 'ApplyError';
    /** @type {boolean} */
    this.retryable = retryable;
  }
}

export class NetworkError extends ApplyError {
  /**
   * @param {string} [message]
   * @param {SubApplyErrorOptions} [options]
   */
  constructor(message = 'Network request failed during apply flow', options = {}) {
    const { metadata = {}, cause = null, platform = null } = options;
    super(message, {
      code: ErrorCodes.CRAWLER_FETCH_FAILED,
      statusCode: 503,
      metadata,
      cause,
      retryable: true,
      platform,
    });
    this.name = 'NetworkError';
  }
}

export class AuthError extends ApplyError {
  /**
   * @param {string} [message]
   * @param {SubApplyErrorOptions} [options]
   */
  constructor(message = 'Authentication failed during apply flow', options = {}) {
    const { metadata = {}, cause = null, platform = null } = options;
    super(message, {
      code: ErrorCodes.PLATFORM_AUTH_FAILED,
      statusCode: 401,
      metadata,
      cause,
      retryable: false,
      platform,
    });
    this.name = 'AuthError';
  }
}

export class RateLimitError extends ApplyError {
  /**
   * @param {string} [message]
   * @param {RateLimitErrorOptions} [options]
   */
  constructor(message = 'Rate limited during apply flow', options = {}) {
    const { retryAfterMs = null, metadata = {}, cause = null, platform = null } = options;
    super(message, {
      code: ErrorCodes.RATE_LIMIT_PLATFORM,
      statusCode: 429,
      metadata: { ...metadata, retryAfterMs },
      cause,
      retryable: true,
      platform,
    });
    this.name = 'RateLimitError';
    /** @type {number | null} */
    this.retryAfterMs = retryAfterMs;
  }
}

export class CaptchaError extends ApplyError {
  /**
   * @param {string} [message]
   * @param {SubApplyErrorOptions} [options]
   */
  constructor(message = 'Captcha challenge detected', options = {}) {
    const { metadata = {}, cause = null, platform = null } = options;
    super(message, {
      code: ErrorCodes.CRAWLER_CAPTCHA,
      statusCode: 403,
      metadata,
      cause,
      retryable: false,
      platform,
    });
    this.name = 'CaptchaError';
  }
}

export class ValidationError extends ApplyError {
  /**
   * @param {string} [message]
   * @param {SubApplyErrorOptions} [options]
   */
  constructor(message = 'Apply validation failed', options = {}) {
    const { metadata = {}, cause = null, platform = null } = options;
    super(message, {
      code: ErrorCodes.APPLICATION_INVALID,
      statusCode: 400,
      metadata,
      cause,
      retryable: false,
      platform,
    });
    this.name = 'ValidationError';
  }
}

export class CircuitOpenError extends ApplyError {
  /**
   * @param {string} [message]
   * @param {SubApplyErrorOptions} [options]
   */
  constructor(message = 'Apply circuit breaker is open', options = {}) {
    const { metadata = {}, cause = null, platform = null } = options;
    super(message, {
      code: ErrorCodes.PLATFORM_UNAVAILABLE,
      statusCode: 503,
      metadata,
      cause,
      retryable: false,
      platform,
    });
    this.name = 'CircuitOpenError';
  }
}

/**
 * @param {ErrorLike | null | undefined} error
 * @param {string[]} codes
 * @returns {boolean}
 */
function hasCode(error, codes) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = error.code || error.cause?.code;
  if (typeof code !== 'string') {
    return false;
  }

  return codes.includes(code);
}

/**
 * @param {ErrorLike | null | undefined} [error]
 * @param {{ platform?: string | null }} [options]
 * @returns {ApplyError}
 */
export function classifyApplyError(error, options = {}) {
  const { platform = null } = options;

  if (error instanceof ApplyError) {
    return error;
  }

  const message = String(error?.message || error || 'Unknown apply error');
  const lowered = message.toLowerCase();
  const statusCode = Number(error?.statusCode || error?.status || 0);

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    hasCode(error, [ErrorCodes.AUTH_REQUIRED, ErrorCodes.AUTH_EXPIRED, ErrorCodes.AUTH_INVALID]) ||
    /(not\s+logged\s*in|login\s+failed|session\s+expired|unauthorized|forbidden|auth)/i.test(
      lowered
    )
  ) {
    return new AuthError(message, { cause: error, platform });
  }

  if (
    hasCode(error, [ErrorCodes.CRAWLER_CAPTCHA]) ||
    /(captcha|recaptcha|cloudflare challenge|verification required)/i.test(lowered)
  ) {
    return new CaptchaError(message, { cause: error, platform });
  }

  if (
    statusCode === 429 ||
    hasCode(error, [ErrorCodes.RATE_LIMITED, ErrorCodes.RATE_LIMIT_PLATFORM]) ||
    /(rate\s*limit|too\s+many\s+requests|429)/i.test(lowered)
  ) {
    const retryAfterMs = Number(error?.retryAfterMs || error?.retryAfter || 0) || null;
    return new RateLimitError(message, {
      cause: error,
      platform,
      retryAfterMs,
    });
  }

  if (
    statusCode >= 500 ||
    hasCode(error, [ErrorCodes.CRAWLER_FETCH_FAILED, ErrorCodes.EXTERNAL_TIMEOUT]) ||
    error?.name === 'AbortError' ||
    /(timeout|timed\s+out|network|econnreset|econnrefused|etimedout|enotfound|failed\s+to\s+fetch|navigation\s+timeout)/i.test(
      lowered
    )
  ) {
    return new NetworkError(message, { cause: error, platform });
  }

  return new ValidationError(message, { cause: error, platform });
}

/**
 * @param {ErrorLike | null | undefined} [error]
 * @returns {boolean}
 */
export function isRetryableApplyError(error) {
  const classified = classifyApplyError(error);
  return Boolean(classified?.retryable);
}
