import { AppError } from './app-error.js';
import { ErrorCodes } from './error-codes.js';

export class ApplyError extends AppError {
  constructor(message = 'Apply flow failed', options = {}) {
    const {
      code = ErrorCodes.PLATFORM_APPLY_FAILED,
      statusCode = 500,
      metadata = {},
      cause = null,
      retryable = false,
      platform = null,
    } = options;

    super(message, code, statusCode, { ...metadata, platform, retryable }, cause);
    this.name = 'ApplyError';
    this.retryable = retryable;
  }
}

export class NetworkError extends ApplyError {
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
    this.retryAfterMs = retryAfterMs;
  }
}

export class CaptchaError extends ApplyError {
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

export function isRetryableApplyError(error) {
  const classified = classifyApplyError(error);
  return Boolean(classified?.retryable);
}
