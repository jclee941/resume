import { AppError } from './app-error.js';
import { ErrorCodes } from './error-codes.js';
import { PlatformError, ValidationError } from './domain-errors.js';

function normalizeStatusCode(value, fallback = 500) {
  if (typeof value !== 'number') {
    return fallback;
  }

  if (value >= 400 && value <= 599) {
    return value;
  }

  return fallback;
}

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

function isWantedAPIError(error) {
  return (
    error &&
    error.name === 'WantedAPIError' &&
    typeof error.statusCode === 'number' &&
    Object.prototype.hasOwnProperty.call(error, 'response')
  );
}

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

function toAppError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (isWantedAPIError(error)) {
    return new PlatformError(error.message || 'Wanted API request failed', {
      platform: 'wanted',
      originalStatus: error.statusCode,
      metadata: { response: error.response },
      cause: error,
      code: ErrorCodes.PLATFORM_API_ERROR,
      statusCode: 502,
    });
  }

  if (error && error.validation) {
    return new ValidationError(error.message || 'Validation failed', {
      fields: extractValidationFields(error.validation),
      metadata: {
        validation: error.validation,
        validationContext: error.validationContext || null,
      },
      cause: error,
      code: ErrorCodes.VALIDATION,
      statusCode: 400,
    });
  }

  if (error instanceof Error) {
    const statusCode = normalizeStatusCode(error.statusCode, 500);
    const code = inferCodeFromStatus(statusCode);
    return AppError.fromError(error, code, statusCode);
  }

  return new AppError('Internal Server Error', ErrorCodes.UNKNOWN, 500, { value: error });
}

export function formatErrorResponse(error) {
  const appError = toAppError(error);

  return {
    error: {
      code: appError.code,
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
