import { withRetry } from '@resume/shared/retry';

import { notifications } from '../../shared/services/notifications/index.js';
import { AuthError } from '../../shared/errors/apply-errors.js';
import { applyViaWantedApiFallback } from './wanted-api-fallback.js';
import { buildApplicationPayload, parseWantedJobId, WANTED_PLATFORM } from './wanted-id.js';
import { resolveResumeKey } from './wanted-applications.js';
import {
  classifyWantedError,
  createRetryReporter,
  enforceRateLimit,
  getErrorStatus,
  isRetryableWantedError,
  isAlreadyAppliedWantedError,
} from './wanted-retry.js';
import { executeWantedBrowserApply } from './wanted-browser-apply.js';
import { getApplicationStatus, validateSession } from './wanted-session.js';

// Issue #16: closure-bound holder eliminates top-level mutable object binding.
const _circuitStateHolder = (() => {
  let s = { failures: 0, openedAt: 0, threshold: 5, resetMs: 30000 };
  return {
    get: () => s,
    reset: () => {
      s = { failures: 0, openedAt: 0, threshold: 5, resetMs: 30000 };
    },
  };
})();

export { getApplicationStatus, validateSession };

const RETRY_CONFIG = {
  platform: WANTED_PLATFORM,
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

export function resetCircuitState() {
  _circuitStateHolder.reset();
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

  if (parseWantedJobId(job.id) === null) {
    return {
      success: false,
      applicationId: null,
      error: 'Invalid Wanted job.id; expected a numeric ID or wanted_<numeric ID>',
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

    if (!this.page) {
      return await applyViaWantedApiFallback({
        ctx: this,
        api: sessionValidation.api,
        job,
        payload,
        resumeKey,
        retryReporter,
        circuitState: _circuitStateHolder.get(),
      });
    }

    return await withRetry(
      () => executeWantedBrowserApply(this, job, payload, resumeKey, retryReporter),
      {
        ...RETRY_CONFIG,
        logger: this.logger,
        classifyError: classifyWantedError,
        reporter: retryReporter,
      }
    );
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    const retryable = isRetryableWantedError(error) || Boolean(normalizedError.retryable);

    if (isAlreadyAppliedWantedError(error)) {
      return {
        success: true,
        applied: false,
        skipped: true,
        status: 'already_applied',
        applicationId: null,
        retryable: false,
      };
    }

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
