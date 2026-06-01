import { ErrorCodes } from './error-codes.js';

export class AppError extends Error {
  /**
   * Polymorphic constructor (SSOT-032 / issue #41 Phase 2). Accepts both:
   *
   *  Legacy job-server signature (positional):
   *    new AppError(message, code, statusCode, metadata, cause)
   *
   *  Canonical packages/shared options-object signature:
   *    new AppError(message, { errorCode, isOperational, context, cause })
   *
   * The canonical surface uses `errorCode`/`context`; legacy uses `code`/`metadata`.
   * Both name pairs are mirrored on the resulting instance so existing consumers
   * keep working unchanged while new code can use the canonical names.
   *
   * @param {string} message
   * @param {string|number|object} [codeOrOptions] - error code (legacy) OR options object (canonical)
   * @param {number} [statusCode=500]
   * @param {object} [metadata={}]
   * @param {Error|null} [cause=null]
   */
  constructor(
    message,
    codeOrOptions = ErrorCodes.UNKNOWN,
    statusCode = 500,
    metadata = {},
    cause = null
  ) {
    let code;
    let resolvedStatusCode = statusCode;
    let resolvedMetadata = metadata;
    let resolvedCause = cause;
    let isOperational = true;

    if (
      codeOrOptions !== null &&
      typeof codeOrOptions === 'object' &&
      !Array.isArray(codeOrOptions)
    ) {
      // Canonical options-object form.
      const opts = codeOrOptions;
      code = opts.errorCode ?? opts.code ?? ErrorCodes.UNKNOWN;
      resolvedStatusCode = opts.statusCode ?? statusCode;
      resolvedMetadata = opts.context ?? opts.metadata ?? {};
      resolvedCause = opts.cause ?? null;
      isOperational = opts.isOperational ?? true;
      super(message, resolvedCause ? { cause: resolvedCause } : undefined);
    } else {
      code = codeOrOptions;
      super(message);
    }

    this.name = 'AppError';
    this.code = code;
    // Mirror as canonical "errorCode" alias.
    this.errorCode = code;
    this.statusCode = resolvedStatusCode;
    this.metadata =
      resolvedMetadata && typeof resolvedMetadata === 'object' ? resolvedMetadata : {};
    // Mirror as canonical "context" alias.
    this.context = this.metadata;
    this.cause = resolvedCause;
    this.isOperational = isOperational;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      metadata: this.metadata,
      ...(this.cause instanceof Error
        ? {
            cause: {
              name: this.cause.name,
              message: this.cause.message,
            },
          }
        : this.cause
          ? { cause: this.cause }
          : {}),
    };
  }

  static fromError(error, code = ErrorCodes.UNKNOWN, statusCode = 500) {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, code, statusCode, { name: error.name }, error);
    }

    return new AppError('Unknown error', code, statusCode, { value: error });
  }
}
