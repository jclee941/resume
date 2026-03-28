import { ErrorCodes } from './error-codes.js';

export class AppError extends Error {
  constructor(message, code = ErrorCodes.UNKNOWN, statusCode = 500, metadata = {}, cause = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata && typeof metadata === 'object' ? metadata : {};
    this.cause = cause || null;

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
