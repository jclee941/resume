import { AppError } from './app-error.js';
import { ErrorCodes } from './error-codes.js';
import { PlatformError, ValidationError } from './domain-errors.js';

/**
 * @typedef {{
 *   params?: { missingProperty?: string };
 *   instancePath?: string;
 *   dataPath?: string;
 * }} ValidationItem
 *
 * @typedef {{
 *   name: 'WantedAPIError';
 *   statusCode: number;
 *   response: unknown;
 *   message?: string;
 * }} WantedAPIErrorLike
 *
 * @typedef {{
 *   message?: string;
 *   statusCode?: number;
 *   name?: string;
 *   response?: unknown;
 *   validation?: Array<ValidationItem>;
 *   validationContext?: unknown;
 *   stack?: string;
 * }} ValidationErrorLike
 */

/**
 * @param {unknown} [value]
 * @param {number} [fallback]
 * @returns {number}
 */
function normalizeStatusCode(value, fallback = 500) {
  if (typeof value !== 'number') {
    return fallback;
  }

  if (value >= 400 && value <= 599) {
    return value;
  }

  return fallback;
}

/**
 * @param {number} statusCode
 * @returns {string}
 */
function inferCodeFromStatus(statusCode) {
  if (statusCode === 404) {
    return ErrorCodes.NOT_FOUND;
  }

  if (statusCode === 408) {
    return ErrorCodes.TIMEOUT;
  }

  if (statusCode === 429) {
    return ErrorCodes.RATE_LIMITED;
  }

  return ErrorCodes.UNKNOWN;
}

/**
 * @param {unknown} error
 * @returns {error is WantedAPIErrorLike}
 */
function isWantedAPIError(error) {
  return (
    /** @type {boolean} */ (error) &&
    /** @type {WantedAPIErrorLike} */ (error).name === 'WantedAPIError' &&
    typeof (/** @type {WantedAPIErrorLike} */ (error).statusCode) === 'number' &&
    Object.prototype.hasOwnProperty.call(/** @type {Record<string, unknown>} */ (error), 'response')
  );
}

/**
 * @param {Array<ValidationItem>} [validation]
 * @returns {string[]}
 */
function extractValidationFields(validation = []) {
  if (!Array.isArray(validation)) {
    return [];
  }

  const fields = new Set();

  for (const item of validation) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const missingField = item.params?.missingProperty;
    if (typeof missingField === 'string' && missingField.length > 0) {
      fields.add(missingField);
    }

    const instancePath =
      typeof item.instancePath === 'string'
        ? item.instancePath
        : typeof item.dataPath === 'string'
          ? item.dataPath
          : '';

    if (instancePath) {
      fields.add(instancePath.replace(/^\/+/, '').replace(/\//g, '.'));
    }
  }

  return [...fields].filter(Boolean);
}

/**
 * @param {unknown} error
 * @returns {AppError}
 */
function toAppError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (isWantedAPIError(error)) {
    return new PlatformError(error.message || 'Wanted API request failed', {
      platform: 'wanted',
      originalStatus: error.statusCode,
      metadata: { response: /** @type {Record<string, unknown>} */ (error.response) },
      cause: /** @type {Error} */ (/** @type {unknown} */ (error)),
      code: ErrorCodes.PLATFORM_API_ERROR,
      statusCode: 502,
    });
  }

  if (error && /** @type {ValidationErrorLike} */ (error).validation) {
    return new ValidationError(
      /** @type {ValidationErrorLike} */ (error).message || 'Validation failed',
      {
        fields: extractValidationFields(/** @type {ValidationErrorLike} */ (error).validation),
        metadata: {
          validation: /** @type {ValidationErrorLike} */ (error).validation,
          validationContext: /** @type {ValidationErrorLike} */ (error).validationContext || null,
        },
        cause: /** @type {Error} */ (/** @type {unknown} */ (error)),
        code: ErrorCodes.VALIDATION,
        statusCode: 400,
      }
    );
  }

  if (error instanceof Error) {
    const statusCode = normalizeStatusCode(
      /** @type {Error & { statusCode?: number }} */ (error).statusCode,
      500
    );
    const code = inferCodeFromStatus(statusCode);
    return AppError.fromError(error, code, statusCode);
  }

  return new AppError('Internal Server Error', ErrorCodes.UNKNOWN, 500, { value: error });
}

/**
 * @param {unknown} error
 * @returns {{ error: { code: string | number; message: string; statusCode: number; stack?: string; details?: Record<string, unknown> } }}
 */
export function formatErrorResponse(error) {
  const appError = toAppError(error);

  return {
    error: {
      code: /** @type {string | number} */ (appError.code),
      message: appError.message,
      statusCode: appError.statusCode,
      ...(process.env.NODE_ENV === 'development' && appError.stack
        ? { stack: appError.stack }
        : {}),
      ...(appError.metadata && Object.keys(appError.metadata).length > 0
        ? { details: appError.metadata }
        : {}),
    },
  };
}
