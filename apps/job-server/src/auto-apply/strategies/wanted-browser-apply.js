import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';
import { AuthError, ValidationError } from '../../shared/errors/apply-errors.js';
import { WANTED_PLATFORM, buildWantedJobUrl } from './wanted-id.js';
import { extractApplicationId } from './wanted-applications.js';
import { isAlreadyAppliedWantedError, sleep } from './wanted-retry.js';

export async function executeWantedBrowserApply(ctx, job, payload, resumeKey, retryReporter) {
  const jobUrl = buildWantedJobUrl(job.id);

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

  const response = await ctx.page.evaluate(async (requestPayload) => {
    const resp = await fetch('/api/chaos/applications/v1', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestPayload),
    });
    const body = await resp.json().catch(() => ({}));
    return { status: resp.status, ok: resp.ok, body };
  }, payload);

  if (!response.ok) {
    const errorMsg = response.body?.message || `API request failed: ${response.status}`;
    const error = { message: errorMsg, status: response.status };
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

    throw new ValidationError(errorMsg, {
      platform: WANTED_PLATFORM,
      metadata: { status: response.status },
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
