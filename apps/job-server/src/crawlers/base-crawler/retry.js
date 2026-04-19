export function calculateBackoff(attempt, config) {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  const jitter = 1 + Math.random() * config.jitterFactor;
  return Math.round(cappedDelay * jitter);
}

export function isRetryable(statusCode, config) {
  if (statusCode === null) {
    return true;
  }

  return config.retryableStatuses.includes(statusCode);
}
