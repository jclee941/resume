import { AppError } from './app-error.js';
import { ErrorCodes } from './error-codes.js';

/**
 * @typedef {{
 *   fields?: string[];
 *   metadata?: Record<string, unknown>;
 *   cause?: Error | null;
 *   code?: string;
 *   statusCode?: number;
 * }} ValidationErrorOptions
 *
 * @typedef {{
 *   platform?: string | null;
 *   metadata?: Record<string, unknown>;
 *   cause?: Error | null;
 *   code?: string;
 *   statusCode?: number;
 * }} AuthenticationErrorOptions
 *
 * @typedef {{
 *   retryAfterMs?: number | null;
 *   platform?: string | null;
 *   metadata?: Record<string, unknown>;
 *   cause?: Error | null;
 *   code?: string;
 *   statusCode?: number;
 * }} RateLimitErrorOptions
 *
 * @typedef {{
 *   platform?: string | null;
 *   url?: string | null;
 *   attempt?: number | null;
 *   metadata?: Record<string, unknown>;
 *   cause?: Error | null;
 *   code?: string;
 *   statusCode?: number;
 * }} CrawlerErrorOptions
 *
 * @typedef {{
 *   platform?: string | null;
 *   originalStatus?: number | null;
 *   metadata?: Record<string, unknown>;
 *   cause?: Error | null;
 *   code?: string;
 *   statusCode?: number;
 * }} PlatformErrorOptions
 *
 * @typedef {{
 *   service?: string | null;
 *   originalStatus?: number | null;
 *   metadata?: Record<string, unknown>;
 *   cause?: Error | null;
 *   code?: string;
 *   statusCode?: number;
 * }} ExternalServiceErrorOptions
 */

export class ValidationError extends AppError {
  /**
   * @param {string} [message]
   * @param {ValidationErrorOptions} [options]
   */
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
  /**
   * @param {string} [message]
   * @param {AuthenticationErrorOptions} [options]
   */
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
  /**
   * @param {string} [message]
   * @param {RateLimitErrorOptions} [options]
   */
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
  /**
   * @param {string} [message]
   * @param {CrawlerErrorOptions} [options]
   */
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
  /**
   * @param {string} [message]
   * @param {PlatformErrorOptions} [options]
   */
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
  /**
   * @param {string} [message]
   * @param {ExternalServiceErrorOptions} [options]
   */
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
