/**
 * Default retry configuration for all crawlers.
 * Override per-instance via `options.retry` or per-request via `rateLimitedFetch(url, { retry })`.
 *
 * @type {RetryConfig}
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.3,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * @typedef {object} RetryConfig
 * @property {number} maxRetries    - Maximum retry attempts (default: 3)
 * @property {number} baseDelay     - Base delay in ms for exponential backoff (default: 1000)
 * @property {number} maxDelay      - Maximum delay cap in ms (default: 30000)
 * @property {number} jitterFactor  - Random jitter multiplier 0-1 (default: 0.3)
 * @property {number[]} retryableStatuses - HTTP status codes eligible for retry
 */

/**
 * @typedef {object} RetryMetrics
 * @property {number} totalRetries        - Total retry attempts across all requests
 * @property {number} successAfterRetry   - Requests that succeeded after at least one retry
 * @property {number} exhaustedRetries    - Requests that failed after all retries exhausted
 * @property {number} nonRetryableFailures - Requests that failed with non-retryable status
 * @property {Date|null} lastRetryAt      - Timestamp of the most recent retry
 */

export function createRetryMetrics() {
  return {
    totalRetries: 0,
    successAfterRetry: 0,
    exhaustedRetries: 0,
    nonRetryableFailures: 0,
    lastRetryAt: null,
  };
}

/**
 * 정규화된 채용공고 형식
 */
export const NormalizedJobSchema = {
  id: '',
  source: '',
  sourceUrl: '',
  position: '',
  company: '',
  companyId: '',
  location: '',
  experienceMin: 0,
  experienceMax: 0,
  salary: '',
  techStack: [],
  description: '',
  requirements: '',
  benefits: '',
  dueDate: null,
  postedDate: null,
  isRemote: false,
  employmentType: '',
  crawledAt: null,
};
