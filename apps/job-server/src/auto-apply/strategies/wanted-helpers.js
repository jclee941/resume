import { ValidationError, classifyApplyError } from '../../shared/errors/apply-errors.js';
import SessionManager from '../../shared/services/session/session-manager.js';

const WANTED_PLATFORM = 'wanted';
const RATE_LIMIT_PER_MINUTE = 60;
const DEFAULT_DELAY_MS = 5000;

// P0-5 audit residual fix: replace module-level mutable singleton with
// closure-bound holder. Same pattern applied to 7 other singletons in
// commit cb37858 (docs/architecture/MONOREPO_REVIEW_2026-04-29.md P0-5).
const _lastSubmissionAtHolder = (() => {
  let v = 0;
  return { get: () => v, set: (x) => { v = x; }, clear: () => { v = 0; } };
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

export function extractApplicationId(result) {
  return (
    result?.application_id ??
    result?.applicationId ??
    result?.id ??
    result?.data?.application_id ??
    result?.data?.applicationId ??
    result?.data?.id ??
    null
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
  const elapsed = now - _lastSubmissionAtHolder.get();

  if (elapsed < minIntervalMs) {
    const waitMs = minIntervalMs - elapsed;
    ctx?.logger?.debug?.(`[wanted] rate-limit delay ${waitMs}ms before next submission`);
    await sleep(waitMs);
  }

  _lastSubmissionAtHolder.set(Date.now());
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

export function buildApplicationPayload(job, options, resumeKey, profileData = {}) {
  const session = SessionManager.load(WANTED_PLATFORM) || {};
  const numericJobId = Number(String(job.id).replace(/^wanted_/, ''));

  return {
    email: session.email || options.email || '',
    username: profileData.name || options.username || session.username || '',
    mobile: profileData.mobile || options.mobile || session.mobile || '',
    job_id: numericJobId,
    resume_keys: resumeKey ? [resumeKey] : [],
    nationality_code: options.nationality_code || 'KR',
    visa: options.visa || null,
    status: 'apply',
    ...(options.extraPayload ? options.extraPayload : {}),
  };
}

export function normalizeApplicationEntries(response) {
  const candidates = [
    response?.applications,
    response?.results,
    response?.data?.applications,
    response?.data?.results,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function isAppliedJob(entry, targetJobId) {
  const postedJobId =
    entry?.job_id ??
    entry?.jobId ??
    entry?.position_id ??
    entry?.positionId ??
    entry?.job?.id ??
    null;

  return String(postedJobId) === String(targetJobId);
}

export async function resolveResumeKey(ctx, api, options = {}) {
  const explicitKey =
    options.resumeKey ??
    options.resume_key ??
    options.resumeId ??
    options.resume_id ??
    ctx?.config?.resumeKey ??
    ctx?.config?.resumeId;

  if (explicitKey) return explicitKey;

  const resumes = await api.chaosRequest('/resumes/v1?offset=0&limit=10');
  const resumeList = resumes?.data ?? (Array.isArray(resumes) ? resumes : []);

  if (!Array.isArray(resumeList) || resumeList.length === 0) {
    throw new ValidationError('No available resume found for Wanted application', {
      platform: WANTED_PLATFORM,
    });
  }

  const defaultResume = resumeList.find((r) => r.is_default) || resumeList[0];
  const resumeKey =
    defaultResume?.key ??
    defaultResume?.id ??
    defaultResume?.resume_id ??
    defaultResume?.uuid ??
    null;

  if (!resumeKey) {
    throw new ValidationError('Unable to resolve resume_key from Wanted profile', {
      platform: WANTED_PLATFORM,
    });
  }

  return resumeKey;
}

export { WANTED_PLATFORM };
