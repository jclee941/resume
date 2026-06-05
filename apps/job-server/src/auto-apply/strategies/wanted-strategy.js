import { withRetry } from '@resume/shared/retry';

import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';
import { AuthError, ValidationError } from '../../shared/errors/apply-errors.js';
import { applyViaWantedApiFallback } from './wanted-api-fallback.js';
import {
  buildApplicationPayload,
  classifyWantedError,
  createRetryReporter,
  enforceRateLimit,
  extractApplicationId,
  getErrorStatus,
  isRetryableWantedError,
  resolveResumeKey,
  sleep,
  WANTED_PLATFORM,
} from './wanted-helpers.js';
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

async function executeWantedBrowserApply(ctx, job, payload, resumeKey, retryReporter) {
  const numericJobId = Number(String(job.id).replace(/^wanted_/, ''));
  const jobUrl = job.sourceUrl || `https://www.wanted.co.kr/wd/${numericJobId}`;

  await ctx.page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  const loginPrompt =
    (await ctx.findByText?.('a', '로그인')) ||
    (await ctx.findByText?.('button', '로그인')) ||
    (await ctx.findByText?.('a', 'Login')) ||
    (await ctx.findByText?.('button', 'Login'));
  if (loginPrompt) {
    throw new AuthError('Not logged in to Wanted', { platform: WANTED_PLATFORM });
  }

  const response = await ctx.page.evaluate(async (p) => {
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
  const application = ctx.appManager.addApplication(job, {
    resumeKey,
    notes: 'Auto-applied via Wanted browser submission (Chaos API v1)',
  });

  ctx.appManager.updateStatus(
    application.id,
    APPLICATION_STATUS.APPLIED,
    'Auto-applied via Wanted browser'
  );

  retryReporter('execution_success', { metrics: { successRate: 1 } });
  notifications
    .notifyApplySuccess(job.company, job.title, job.sourceUrl, WANTED_PLATFORM)
    .catch(() => {});

  return {
    success: true,
    applicationId: applicationId ?? application.id,
    application,
    retryable: false,
  };
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

    return await withRetry(() => executeWantedBrowserApply(this, job, payload, resumeKey, retryReporter), {
      ...RETRY_CONFIG,
      logger: this.logger,
      classifyError: classifyWantedError,
      reporter: retryReporter,
    });
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
