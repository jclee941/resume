export class HttpError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errorCode = options.errorCode || `HTTP_${statusCode}`;
    this.isOperational = true;
    this.context = options.context || {};
  }

  toResponse(headers = {}) {
    return new Response(
      JSON.stringify({
        error: { message: this.message, code: this.errorCode },
      }),
      {
        status: this.statusCode,
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  }
}

/**
 * @param {unknown} err
 * @param {Record<string, unknown>} [context]
 * @returns {{ message: string, errorCode: string, context: Record<string, unknown>, stack: string | undefined }}
 */
export function normalizeError(err, context = {}) {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      errorCode: err.errorCode || 'UNKNOWN_ERROR',
      context: { ...context, ...(err.context || {}) },
      stack: err.stack,
    };
  }
  return {
    message: String(err),
    name: 'UnknownError',
    errorCode: 'UNKNOWN_ERROR',
    context,
    stack: undefined,
  };
}
