/**
 * Unified Error Class Hierarchy
 *
 * Base error classes for structured error handling across the monorepo.
 * All errors follow a consistent pattern:
 * - errorCode: Machine-readable error identifier (e.g., 'AUTH_TOKEN_EXPIRED')
 * - isOperational: true = expected/recoverable, false = programmer error
 * - context: Additional structured data for debugging
 *
 * @module shared/errors
 */

/**
 * Base application error. All custom errors extend this.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {object} [options]
   * @param {string} [options.errorCode='INTERNAL_ERROR'] - Machine-readable code
   * @param {boolean} [options.isOperational=true] - Expected (true) vs programmer error (false)
   * @param {object} [options.context={}] - Structured debug data
   * @param {Error} [options.cause] - Original error (Error.cause chaining)
   */
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.errorCode = options.errorCode || 'INTERNAL_ERROR';
    this.isOperational = options.isOperational !== false;
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();
  }

  /** Serialize for structured logging (ECS-compatible) */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      isOperational: this.isOperational,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack?.substring(0, 2000),
      ...(this.cause && {
        cause:
          this.cause instanceof AppError
            ? this.cause.toJSON()
            : { message: this.cause.message, name: this.cause.name },
      }),
    };
  }
}

/**
 * HTTP-specific errors with status codes.
 * Used by Workers to generate proper HTTP error responses.
 */
export class HttpError extends AppError {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message
   * @param {object} [options]
   */
  constructor(statusCode, message, options = {}) {
    super(message, {
      errorCode: options.errorCode || `HTTP_${statusCode}`,
      ...options,
    });
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }

  /** Generate JSON error response for Workers */
  toResponse(headers = {}) {
    return new Response(
      JSON.stringify({
        error: this.message,
        errorCode: this.errorCode,
        ...(this.context.details && { details: this.context.details }),
      }),
      {
        status: this.statusCode,
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  }
}

// Convenience HTTP error subclasses
export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', options = {}) {
    super(400, message, { errorCode: 'BAD_REQUEST', ...options });
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', options = {}) {
    super(401, message, { errorCode: 'UNAUTHORIZED', ...options });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', options = {}) {
    super(403, message, { errorCode: 'FORBIDDEN', ...options });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', options = {}) {
    super(404, message, { errorCode: 'NOT_FOUND', ...options });
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Too Many Requests', options = {}) {
    super(429, message, { errorCode: 'RATE_LIMITED', ...options });
    this.name = 'RateLimitError';
  }
}

/**
 * Crawler-specific errors for stealth crawling operations.
 */
export class CrawlerError extends AppError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.platform] - Target platform (wanted, saramin, etc.)
   * @param {string} [options.step] - Crawl step that failed (login, search, apply)
   */
  constructor(message, options = {}) {
    super(message, {
      errorCode: options.errorCode || 'CRAWLER_ERROR',
      ...options,
    });
    this.name = 'CrawlerError';
    this.platform = options.platform || 'unknown';
    this.step = options.step || 'unknown';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      platform: this.platform,
      step: this.step,
    };
  }
}

/**
 * Authentication/authorization flow errors.
 */
export class AuthError extends AppError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.provider] - Auth provider (wanted, google, etc.)
   */
  constructor(message, options = {}) {
    super(message, {
      errorCode: options.errorCode || 'AUTH_ERROR',
      ...options,
    });
    this.name = 'AuthError';
    this.provider = options.provider || 'unknown';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      provider: this.provider,
    };
  }
}

/**
 * Input validation errors.
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {Array<{field: string, message: string}>} [options.errors] - Field-level errors
   */
  constructor(message, options = {}) {
    super(message, {
      errorCode: options.errorCode || 'VALIDATION_ERROR',
      ...options,
    });
    this.name = 'ValidationError';
    this.errors = options.errors || [];
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * External service communication errors (Elasticsearch, Slack, D1, KV, etc.)
 */
export class ExternalServiceError extends AppError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.service] - Service name (elasticsearch, slack, d1, kv)
   * @param {number} [options.statusCode] - HTTP status from external service
   */
  constructor(message, options = {}) {
    super(message, {
      errorCode: options.errorCode || 'EXTERNAL_SERVICE_ERROR',
      isOperational: options.isOperational !== false,
      ...options,
    });
    this.name = 'ExternalServiceError';
    this.service = options.service || 'unknown';
    this.serviceStatusCode = options.statusCode;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      service: this.service,
      serviceStatusCode: this.serviceStatusCode,
    };
  }
}

/**
 * Wrap an unknown thrown value into an AppError.
 * Handles: Error instances, strings, objects, null/undefined.
 *
 * @param {unknown} err - The caught value
 * @param {object} [context={}] - Additional context
 * @returns {AppError}
 */
export function normalizeError(err, context = {}) {
  if (err instanceof AppError) {
    if (Object.keys(context).length > 0) {
      err.context = { ...err.context, ...context };
    }
    return err;
  }

  if (err instanceof Error) {
    return new AppError(err.message, {
      errorCode: 'UNHANDLED_ERROR',
      isOperational: false,
      context,
      cause: err,
    });
  }

  const message = typeof err === 'string' ? err : 'Unknown error';
  return new AppError(message, {
    errorCode: 'UNKNOWN_ERROR',
    isOperational: false,
    context: { ...context, rawError: String(err) },
  });
}
