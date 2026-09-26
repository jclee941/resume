const RETRYABLE = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 429, 500, 502, 503, 504];

export const RETRY = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: RETRYABLE,
};

export const CIRCUIT = { failureThreshold: 5, resetTimeout: 60000, halfOpenMaxCalls: 3 };

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const nowMs = () => Date.now();

export function retryable(error, config) {
  const values = new Set(config.retryableErrors);
  const code = error?.code ?? error?.cause?.code;
  if (code && values.has(code)) return true;
  return [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.cause?.status,
    error?.cause?.statusCode,
  ].some((status) => Number.isFinite(Number(status)) && values.has(Number(status)));
}

export function delay(attempt, config) {
  const capped = Math.min(config.maxDelay, config.baseDelay * config.backoffMultiplier ** attempt);
  return Math.floor(config.jitter ? capped * (0.5 + Math.random()) : capped);
}
