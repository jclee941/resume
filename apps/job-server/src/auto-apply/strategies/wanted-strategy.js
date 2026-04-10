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
const WANTED_APPLICATION_ENDPOINT = '/applications/v2';
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

async function resolveResumeId(ctx, api, options = {}) {
  const explicitResumeId =
    options.resumeId ?? options.resume_id ?? ctx?.config?.resumeId ?? ctx?.config?.resume_id;

  if (explicitResumeId) {
    return explicitResumeId;
  }

  const resumes = await api.getResumes();
  const resumeList =
    resumes?.resumes ??
    resumes?.results ??
    resumes?.data ??
    (Array.isArray(resumes) ? resumes : []);

  if (!Array.isArray(resumeList) || resumeList.length === 0) {
    throw new ValidationError('No available resume found for Wanted application', {
      platform: WANTED_PLATFORM,
    });
  }

  const firstResume = resumeList[0];
  const selectedResumeId =
    firstResume?.id ?? firstResume?.resume_id ?? firstResume?.resumeId ?? firstResume?.uuid ?? null;

  if (!selectedResumeId) {
    throw new ValidationError('Unable to resolve resume_id from Wanted profile', {
      platform: WANTED_PLATFORM,
    });
  }

  return selectedResumeId;
}

function buildApplicationPayload(job, options, resumeId) {
  const coverLetter = options.coverLetter ?? options.cover_letter ?? '';

  return {
    job_id: job.id,
    resume_id: resumeId,
    cover_letter: coverLetter || '',
    ...(options.answers ? { answers: options.answers } : {}),
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

  const statusResult = await getApplicationStatus(job.id);
  if (statusResult.success && statusResult.applied) {
    return {
      success: false,
      applicationId: statusResult.applicationId,
      error: 'Already applied to this Wanted job',
      retryable: false,
    };
  }

  let resumeId;
  try {
    resumeId = await resolveResumeId(this, sessionValidation.api, options);
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    return {
      success: false,
      applicationId: null,
      error: normalizedError.message,
      retryable: Boolean(normalizedError.retryable),
    };
  }

  const payload = buildApplicationPayload(job, options, resumeId);
  const retryReporter = createRetryReporter(this, job);

  try {
    await enforceRateLimit(this, options);

    const response = await retryService.execute(
      () =>
        sessionValidation.api.chaosRequest(WANTED_APPLICATION_ENDPOINT, {
          method: 'POST',
          body: payload,
        }),
      {
        serviceName: `${WANTED_PLATFORM}-applications-v2`,
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
      }
    );

    const applicationId = extractApplicationId(response);
    const application = this.appManager.addApplication(job, {
      resumeId,
      coverLetter: payload.cover_letter,
      notes: 'Auto-applied via Wanted API (chaos applications v2)',
    });
    this.appManager.updateStatus(
      application.id,
      APPLICATION_STATUS.APPLIED,
      'Auto-applied via Wanted API'
    );

    retryReporter('execution_success', {
      metrics: {
        successRate:
          retryService.getStats()?.services?.[`${WANTED_PLATFORM}-applications-v2`]?.successRate,
      },
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
    const isCircuitOpen = /circuit is open/i.test(error?.message ?? '');
    const retryable = isCircuitOpen
      ? false
      : isRetryableWantedError(error) || Boolean(normalizedError.retryable);

    retryReporter('execution_failed', {
      metrics: {
        successRate:
          retryService.getStats()?.services?.[`${WANTED_PLATFORM}-applications-v2`]?.successRate,
      },
      error: normalizedError,
    });

    this.logger?.error?.('[wanted] API apply failed', {
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
