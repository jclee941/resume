import { classifyApplyError } from '../../shared/errors/apply-errors.js';
import { WANTED_PLATFORM } from './wanted-id.js';

/**
 * @typedef {Object} WantedErrorLike
 * @property {string} [message]
 * @property {number | string} [status]
 * @property {number | string} [statusCode]
 * @property {{ status?: number | string }} [response]
 * @property {{ status?: number | string, statusCode?: number | string }} [cause]
 * @property {{ message?: string }} [body]
 */

/**
 * @typedef {Object} DelayOptions
 * @property {number | string} [delayBetweenSubmissionsMs]
 * @property {number | string} [delayBetweenSubmissions]
 * @property {number | string} [delayBetweenApps]
 */

/**
 * @typedef {Object} RetryContext
 * @property {{ delayBetweenApps?: number | string, [key: string]: unknown }} [config]
 * @property {{ debug?: (msg: string) => void, info?: (msg: string) => void, [key: string]: unknown }} [logger]
 * @property {{ recordApplyRetryMetric?: (event: string, payload: unknown) => void }} [statsService]
 * @property {{ recordRetryMetric?: (event: string, payload: unknown) => void }} [appManager]
 */

/**
 * @typedef {Object} RetryJob
 * @property {string} [company]
 * @property {string} [title]
 * @property {string | number} [id]
 * @property {string} [source]
 */

/**
 * @typedef {Object} RetryPayload
 * @property {{ successRate?: number, [key: string]: unknown }} [metrics]
 * @property {unknown} [error]
 * @property {number} [attempt]
 */

/**
 * @typedef {(event: string, payload?: RetryPayload) => void} RetryReporter
 */

const RATE_LIMIT_PER_MINUTE = 60;
const DEFAULT_DELAY_MS = 5000;
const lastSubmissionAt = (() => {
  let value = 0;
  return {
    get: () => value,
    /** @param {number} next */
    set: (next) => {
      value = next;
    },
  };
})();

/**
 * @param {unknown} [error]
 * @returns {import('../../shared/errors/apply-errors.js').ApplyError}
 */
export function classifyWantedError(error) {
  return classifyApplyError(error, { platform: WANTED_PLATFORM });
}

/**
 * @param {WantedErrorLike | null | undefined} error
 * @returns {number}
 */
export function getErrorStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.cause?.status,
    error?.cause?.statusCode,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

/**
 * @param {WantedErrorLike | null | undefined} error
 * @returns {boolean}
 */
export function isRetryableWantedError(error) {
  if (/circuit is open/i.test(error?.message ?? '')) {
    return false;
  }

  const status = getErrorStatus(error);
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * @param {WantedErrorLike | null | undefined} error
 * @returns {boolean}
 */
export function isAlreadyAppliedWantedError(error) {
  const status = getErrorStatus(error);
  const message = String(error?.message || error?.body?.message || '').toLowerCase();

  return (
    status === 400 &&
    (message.includes('already') || message.includes('duplicate') || message.includes('이미 지원'))
  );
}

/**
 * @param {RetryContext} ctx
 * @param {DelayOptions} [options]
 * @returns {number}
 */
function resolveDelayMs(ctx, options = {}) {
  const configured =
    options.delayBetweenSubmissionsMs ??
    options.delayBetweenSubmissions ??
    options.delayBetweenApps ??
    ctx?.config?.delayBetweenApps;

  const parsed = Number(configured);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return DEFAULT_DELAY_MS;
}

/**
 * @param {RetryContext} ctx
 * @param {DelayOptions} [options]
 * @returns {Promise<void>}
 */
export async function enforceRateLimit(ctx, options = {}) {
  const now = Date.now();
  const minIntervalMs = Math.max(
    resolveDelayMs(ctx, options),
    Math.ceil(60000 / RATE_LIMIT_PER_MINUTE)
  );
  const elapsed = now - lastSubmissionAt.get();

  if (elapsed < minIntervalMs) {
    const waitMs = minIntervalMs - elapsed;
    ctx?.logger?.debug?.(`[wanted] rate-limit delay ${waitMs}ms before next submission`);
    await sleep(waitMs);
  }

  lastSubmissionAt.set(Date.now());
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {RetryContext} ctx
 * @param {RetryJob} job
 * @returns {RetryReporter}
 */
export function createRetryReporter(ctx, job) {
  return (event, payload) => {
    if (typeof ctx?.statsService?.recordApplyRetryMetric === 'function') {
      ctx.statsService.recordApplyRetryMetric(event, payload);
    }

    if (typeof ctx?.appManager?.recordRetryMetric === 'function') {
      ctx.appManager.recordRetryMetric(event, payload);
    }

    if (event === 'execution_success' || event === 'execution_failed') {
      const successRate = payload?.metrics?.successRate;
      ctx.logger?.info?.(
        `[retry:wanted] ${event} for ${job.company}/${job.title} (successRate=${successRate ?? 0})`
      );
    }
  };
}
