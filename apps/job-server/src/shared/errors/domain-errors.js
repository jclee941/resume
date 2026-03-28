import { AppError } from './app-error.js';
import { ErrorCodes } from './error-codes.js';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', options = {}) {
    const { fields = [], metadata = {}, cause = null, code, statusCode } = options;
    super(
      message,
      code || ErrorCodes.VALIDATION,
      statusCode || 400,
      { ...metadata, fields: Array.isArray(fields) ? fields : [] },
      cause
    );
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', options = {}) {
    const { platform = null, metadata = {}, cause = null, code, statusCode } = options;
    super(
      message,
      code || ErrorCodes.AUTH_REQUIRED,
      statusCode || 401,
      { ...metadata, platform },
      cause
    );
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', options = {}) {
    const {
      retryAfterMs = null,
      platform = null,
      metadata = {},
      cause = null,
      code,
      statusCode,
    } = options;
    super(
      message,
      code || ErrorCodes.RATE_LIMITED,
      statusCode || 429,
      { ...metadata, retryAfterMs, platform },
      cause
    );
    this.name = 'RateLimitError';
  }
}

export class CrawlerError extends AppError {
  constructor(message = 'Crawler request failed', options = {}) {
    const {
      platform = null,
      url = null,
      attempt = null,
      metadata = {},
      cause = null,
      code,
      statusCode,
    } = options;
    super(
      message,
      code || ErrorCodes.CRAWLER_FETCH_FAILED,
      statusCode || 502,
      { ...metadata, platform, url, attempt },
      cause
    );
    this.name = 'CrawlerError';
  }
}

export class PlatformError extends AppError {
  constructor(message = 'Platform API error', options = {}) {
    const {
      platform = null,
      originalStatus = null,
      metadata = {},
      cause = null,
      code,
      statusCode,
    } = options;
    super(
      message,
      code || ErrorCodes.PLATFORM_API_ERROR,
      statusCode || 502,
      { ...metadata, platform, originalStatus },
      cause
    );
    this.name = 'PlatformError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service API error', options = {}) {
    const {
      service = null,
      originalStatus = null,
      metadata = {},
      cause = null,
      code,
      statusCode,
    } = options;
    super(
      message,
      code || ErrorCodes.EXTERNAL_API_ERROR,
      statusCode || 502,
      { ...metadata, service, originalStatus },
      cause
    );
    this.name = 'ExternalServiceError';
  }
}
