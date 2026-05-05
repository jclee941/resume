/**
 * Re-export of canonical retry primitives — SSOT-039 / issue #48.
 *
 * The canonical implementation lives in
 * `@resume/shared/retry` (`packages/shared/src/retry/with-retry.js`).
 * This file is preserved as a thin re-export so existing import paths
 * (`apps/job-dashboard/src/utils/retry.js`) keep working without churn.
 *
 * New code should prefer:
 *
 *   import { withRetry } from '@resume/shared/retry';
 */

export {
  withRetry,
  isRetryableError,
  parseRetryAfter,
  RETRY_DEFAULT_RETRYABLE_ERRORS,
} from '@resume/shared/retry';
