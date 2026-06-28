import { classifyApplyError } from '../../shared/errors/apply-errors.js';
import { WANTED_PLATFORM } from './wanted-id.js';

const RATE_LIMIT_PER_MINUTE = 60;
const DEFAULT_DELAY_MS = 5000;
const lastSubmissionAt = (() => {
  let value = 0;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
  };
})();

export function classifyWantedError(error) {
  return classifyApplyError(error, { platform: WANTED_PLATFORM });
}

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

export function isRetryableWantedError(error) {
  if (/circuit is open/i.test(error?.message ?? '')) {
    return false;
  }

  const status = getErrorStatus(error);
  return status === 429 || (status >= 500 && status <= 599);
}

export function isAlreadyAppliedWantedError(error) {
  const status = getErrorStatus(error);
  const message = String(error?.message || error?.body?.message || '').toLowerCase();

  return (
    status === 400 &&
    (message.includes('already') || message.includes('duplicate') || message.includes('이미 지원'))
  );
}

export function resolveDelayMs(ctx, options = {}) {
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

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
