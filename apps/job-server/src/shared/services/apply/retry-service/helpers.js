export function nowMs() {
  return Date.now();
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableError(error, retryConfig) {
  const retryableSet = new Set(retryConfig.retryableErrors);
  const code = error?.code ?? error?.cause?.code;

  if (code && retryableSet.has(code)) {
    return true;
  }

  const statusCandidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.cause?.status,
    error?.cause?.statusCode,
  ];

  return statusCandidates.some(
    (status) => Number.isFinite(Number(status)) && retryableSet.has(Number(status))
  );
}

export function calculateBackoffDelay(attempt, retryConfig) {
  const exponential = retryConfig.baseDelay * retryConfig.backoffMultiplier ** attempt;
  const capped = Math.min(retryConfig.maxDelay, exponential);

  if (!retryConfig.jitter) {
    return Math.floor(capped);
  }

  const jitterFactor = 0.5 + Math.random();
  return Math.floor(capped * jitterFactor);
}
