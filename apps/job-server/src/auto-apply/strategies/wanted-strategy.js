import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';
import {
  AuthError,
  ValidationError,
  classifyApplyError,
} from '../../shared/errors/apply-errors.js';
import SessionManager from '../../shared/services/session/session-manager.js';
import { RetryService } from '../../shared/services/apply/retry-service.js';

const WANTED_PLATFORM = 'wanted';
const WANTED_APPLICATION_ENDPOINT = '/applications/v1';
const RATE_LIMIT_PER_MINUTE = 60;
const DEFAULT_DELAY_MS = 5000;

const retryService = new RetryService({
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    retryableErrors: [429, 500, 502, 503, 504],
  },
  circuit: {
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenMaxCalls: 3,
  },
});

let lastSubmissionAt = 0;

function createRetryReporter(ctx, job) {
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

function classifyWantedError(error) {
  return classifyApplyError(error, { platform: WANTED_PLATFORM });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error) {
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

function isRetryableWantedError(error) {
  // Circuit breaker 'open' errors are NOT retryable: the breaker is actively
  // protecting the service and retrying would bypass the cooldown protection.
  if (/circuit is open/i.test(error?.message ?? '')) {
    return false;
  }
  const status = getErrorStatus(error);
  return status === 429 || (status >= 500 && status <= 599);
}

function extractApplicationId(result) {
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

async function enforceRateLimit(ctx, options = {}) {
  const now = Date.now();
  const minIntervalMs = Math.max(
    resolveDelayMs(ctx, options),
    Math.ceil(60000 / RATE_LIMIT_PER_MINUTE)
  );
  const elapsed = now - lastSubmissionAt;

  if (elapsed < minIntervalMs) {
    const waitMs = minIntervalMs - elapsed;
    ctx?.logger?.debug?.(`[wanted] rate-limit delay ${waitMs}ms before next submission`);
    await sleep(waitMs);
  }

  lastSubmissionAt = Date.now();
}

async function resolveResumeKey(ctx, api, options = {}) {
  const explicitKey =
    options.resumeKey ?? options.resume_key ?? options.resumeId ?? options.resume_id ??
    ctx?.config?.resumeKey ?? ctx?.config?.resumeId;

  if (explicitKey) return explicitKey;

  // Fetch resume list from Chaos API v1 — returns data[].wanted_resume_id (numeric) and UUID keys
  const resumes = await api.chaosRequest('/resumes/v1?offset=0&limit=10');
  const resumeList = resumes?.data ?? (Array.isArray(resumes) ? resumes : []);

  if (!Array.isArray(resumeList) || resumeList.length === 0) {
    throw new ValidationError('No available resume found for Wanted application', {
      platform: WANTED_PLATFORM,
    });
  }

  // Use the default resume, or first available
  const defaultResume = resumeList.find((r) => r.is_default) || resumeList[0];
  // The resume_key for applications is NOT wanted_resume_id (numeric).
  // It's the UUID-style key visible in the UI radio input id attribute.
  // Chaos API v1 returns it in the 'key' field (e.g. "AwEACwcAAgJIAgcDCwUAB01F").
  const resumeKey =
    defaultResume?.key ?? defaultResume?.id ?? defaultResume?.resume_id ?? defaultResume?.uuid ?? null;

  if (!resumeKey) {
    throw new ValidationError('Unable to resolve resume_key from Wanted profile', {
      platform: WANTED_PLATFORM,
    });
  }

  return resumeKey;
}

function buildApplicationPayload(job, options, resumeKey, profileData = {}) {
  // Reverse-engineered from Wanted web client (2026-04-15)
  // POST /api/chaos/applications/v1
  // status: 'write' = draft, 'apply' = submitted
  const session = SessionManager.load('wanted') || {};
  // Strip platform prefix from job ID (e.g. 'wanted_301477' -> 301477)
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

function normalizeApplicationEntries(response) {
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

function isAppliedJob(entry, targetJobId) {
  const postedJobId =
    entry?.job_id ??
    entry?.jobId ??
    entry?.position_id ??
    entry?.positionId ??
    entry?.job?.id ??
    null;

  return String(postedJobId) === String(targetJobId);
}

export async function validateSession() {
  const session = SessionManager.load(WANTED_PLATFORM);
  if (!session) {
    return {
      valid: false,
      error: 'Wanted session not found',
      retryable: false,
    };
  }

  const api = await SessionManager.getAPI(WANTED_PLATFORM);
  if (!api) {
    return {
      valid: false,
      error: 'Wanted session cookies are missing or expired',
      retryable: false,
    };
  }

  try {
    await api.getProfile();
    return { valid: true, api };
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    return {
      valid: false,
      error: normalizedError.message,
      retryable: Boolean(normalizedError.retryable),
    };
  }
}

export async function getApplicationStatus(jobId) {
  const sessionValidation = await validateSession();
  if (!sessionValidation.valid) {
    return {
      success: false,
      applied: false,
      error: sessionValidation.error,
      retryable: sessionValidation.retryable,
    };
  }

  try {
    const response = await sessionValidation.api.getApplications({ limit: 100, page: 1 });
    const applications = normalizeApplicationEntries(response);
    const matched = applications.find((entry) => isAppliedJob(entry, jobId));

    return {
      success: true,
      applied: Boolean(matched),
      status: matched?.status ?? matched?.application_status ?? null,
      applicationId: extractApplicationId(matched),
      retryable: false,
    };
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    return {
      success: false,
      applied: false,
      error: normalizedError.message,
      retryable: Boolean(normalizedError.retryable),
    };
  }
}

// Simple circuit breaker for API fallback path
const _circuitState = { failures: 0, openedAt: 0, threshold: 5, resetMs: 30000 };
export function resetCircuitState() { _circuitState.failures = 0; _circuitState.openedAt = 0; }

export async function applyToJob(job, options = {}) {
  if (!job?.id) {
    return {
      success: false,
      applicationId: null,
      error: 'job.id is required for Wanted application',
      retryable: false,
    };
  }

  const sessionValidation = await validateSession();
  if (!sessionValidation.valid) {
    const authError = new AuthError(sessionValidation.error || 'Not logged in to Wanted', {
      platform: WANTED_PLATFORM,
    });
    return {
      success: false,
      applicationId: null,
      error: authError.message,
      retryable: false,
    };
  }

  let resumeKey;
  try {
    resumeKey = await resolveResumeKey(this, sessionValidation.api, options);
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    return {
      success: false,
      applicationId: null,
      error: normalizedError.message,
      retryable: Boolean(normalizedError.retryable),
    };
  }

  // Fetch profile data for username/mobile fields
  let profileData = {};
  try {
    profileData = await sessionValidation.api.getProfile();
  } catch {
    // Profile fetch is best-effort; proceed with session data
  }

  const payload = buildApplicationPayload(job, options, resumeKey, profileData);
  const retryReporter = createRetryReporter(this, job);

  try {
    await enforceRateLimit(this, options);

    // Browser-based submission: the Chaos API requires HttpOnly cookies
    // that can only be sent from a browser context (not via HttpClient headers).
    // Use page.evaluate(fetch(...)) so the browser includes all cookies automatically.
    // Fallback: if no browser page available (e.g. tests), use API chaosRequest directly.
    if (!this.page) {
      // Circuit breaker check
      if (_circuitState.failures >= _circuitState.threshold) {
        if (Date.now() - _circuitState.openedAt < _circuitState.resetMs) {
          return {
            success: false,
            applicationId: null,
            error: 'Circuit is open — too many consecutive failures',
            retryable: false,
          };
        }
        _circuitState.failures = 0; // Reset after cool-down
      }

      // API fallback with retry
      let apiResult = null;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          apiResult = await sessionValidation.api.chaosRequest('/applications/v1', {
            method: 'POST',
            body: payload,
          });
          break;
        } catch (err) {
          const status = err.status || err.statusCode || 0;
          if (status >= 500 && attempt < maxRetries) {
            retryReporter('retry', { attempt, error: err });
            this.statsService?.recordApplyRetryMetric?.({ attempt, status });
            this.appManager?.recordRetryMetric?.({ attempt, status });
            await sleep(500 * attempt);
            continue;
          }
          _circuitState.failures++;
          if (_circuitState.failures >= _circuitState.threshold) _circuitState.openedAt = Date.now();
          throw err;
        }
      }
      const applicationId = extractApplicationId(apiResult);
      _circuitState.failures = 0; // Reset on success
      const application = this.appManager.addApplication(job, {
        resumeKey,
        notes: 'Auto-applied via Wanted API fallback',
      });
      this.appManager.updateStatus(
        application.id,
        APPLICATION_STATUS.APPLIED,
        'Auto-applied via Wanted API'
      );
      retryReporter('execution_success', { metrics: { successRate: 1 } });
      notifications.notifyApplySuccess(job.company, job.title, job.sourceUrl, WANTED_PLATFORM).catch(() => {});
      return {
        success: true,
        applicationId: applicationId ?? application.id,
        application,
        retryable: false,
      };
    }

    const numericJobId = Number(String(job.id).replace(/^wanted_/, ''));
    const jobUrl = job.sourceUrl || `https://www.wanted.co.kr/wd/${numericJobId}`;

    // Navigate to job page to set proper Referer and origin context
    await this.page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1500);

    const response = await this.page.evaluate(async (p) => {
      const resp = await fetch('/api/chaos/applications/v1', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(p),
      });
      const body = await resp.json().catch(() => ({}));
      return { status: resp.status, ok: resp.ok, body };
    }, payload);

    if (!response.ok) {
      const errorMsg = response.body?.message || `API request failed: ${response.status}`;
      throw new ValidationError(errorMsg, {
        platform: WANTED_PLATFORM,
        status: response.status,
      });
    }

    const applicationId = extractApplicationId(response.body);
    const application = this.appManager.addApplication(job, {
      resumeKey,
      notes: 'Auto-applied via Wanted browser submission (Chaos API v1)',
    });
    this.appManager.updateStatus(
      application.id,
      APPLICATION_STATUS.APPLIED,
      'Auto-applied via Wanted browser'
    );

    retryReporter('execution_success', {
      metrics: { successRate: 1 },
    });

    notifications
      .notifyApplySuccess(job.company, job.title, job.sourceUrl, WANTED_PLATFORM)
      .catch(() => {});

    return {
      success: true,
      applicationId: applicationId ?? application.id,
      application,
      retryable: false,
    };
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    const retryable = isRetryableWantedError(error) || Boolean(normalizedError.retryable);

    retryReporter('execution_failed', {
      metrics: { successRate: 0 },
      error: normalizedError,
    });

    this.logger?.error?.('[wanted] browser apply failed', {
      jobId: job.id,
      company: job.company,
      title: job.title,
      status: getErrorStatus(error),
      retryable,
      message: normalizedError.message,
    });

    notifications
      .notifyApplyFailed(
        job.company,
        job.title,
        job.sourceUrl,
        normalizedError.message,
        WANTED_PLATFORM
      )
      .catch(() => {});

    return {
      success: false,
      applicationId: null,
      error: normalizedError.message,
      retryable,
    };
  }
}

export async function applyToWanted(job) {
  return applyToJob.call(this, job, {});
}
