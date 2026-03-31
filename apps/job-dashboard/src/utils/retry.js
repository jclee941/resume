const DEFAULT_RETRYABLE_ERRORS = ['ETIMEDOUT', 'ETIMEOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getHttpStatus(error) {
  return error?.response?.status ?? error?.status ?? null;
}

export function parseRetryAfter(error) {
  const retryAfter =
    error?.response?.data?.parameters?.retry_after ??
    error?.response?.data?.retry_after ??
    error?.parameters?.retry_after ??
    error?.retry_after ??
    null;

  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds;
}

export function isRetryableError(error, retryableErrors = DEFAULT_RETRYABLE_ERRORS) {
  if (!error) {
    return false;
  }

  const code = error?.code;
  if (code && retryableErrors.includes(code)) {
    return true;
  }

  const status = getHttpStatus(error);
  if (status === 429) {
    return true;
  }

  if (status >= 500 && status < 600) {
    return true;
  }

  if (status >= 400 && status < 500) {
    return false;
  }

  if (
    error?.name === 'ValidationError' ||
    error?.code === 'VALIDATION_ERROR' ||
    error?.code === 'AUTH_ERROR'
  ) {
    return false;
  }

  return false;
}

export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 4,
    baseDelay = 1000,
    maxDelay = 30000,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }

      if (!isRetryableError(error, retryableErrors)) {
        throw error;
      }

      if (!shouldRetry(error)) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 1001);
      const exponential = baseDelay * 2 ** attempt;
      let delay = Math.min(maxDelay, exponential + jitter);

      const retryAfterSeconds = parseRetryAfter(error);
      if (retryAfterSeconds !== null) {
        delay = Math.min(maxDelay, Math.max(delay, retryAfterSeconds * 1000));
      }

      await sleep(delay);
      attempt += 1;
    }
  }
}
