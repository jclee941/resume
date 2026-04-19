export const CircuitState = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

export const DEFAULT_RETRY_CONFIG = Object.freeze({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 429, 500, 502, 503, 504],
});

export const DEFAULT_CIRCUIT_CONFIG = Object.freeze({
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenMaxCalls: 3,
});
