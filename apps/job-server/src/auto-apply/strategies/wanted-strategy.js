import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';
import {
  AuthError,
  CaptchaError,
  RateLimitError,
  ValidationError,
  classifyApplyError,
} from '../../shared/errors/apply-errors.js';
import { withRetry } from '../../shared/utils/retry.js';

const RETRY_CONFIG = {
  platform: 'wanted',
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

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
  return classifyApplyError(error, { platform: 'wanted' });
}

async function executeWantedApply(job) {
  await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2000));

  const loginLink =
    (await this.findByText('a', '로그인')) ||
    (await this.findByText('a', 'Sign in')) ||
    (await this.findByText('button', '로그인')) ||
    (await this.findByText('button', 'Sign in'));
  if (loginLink) {
    throw new AuthError('Not logged in to Wanted', { platform: 'wanted' });
  }

  const captchaChallenge =
    (await this.findElementWithText('captcha')) ||
    (await this.findElementWithText('로봇이 아닙니다')) ||
    (await this.findElementWithText('자동입력방지'));
  if (captchaChallenge) {
    throw new CaptchaError('Wanted captcha challenge detected', { platform: 'wanted' });
  }

  const rateLimited =
    (await this.findElementWithText('잠시 후 다시 시도')) ||
    (await this.findElementWithText('too many requests')) ||
    (await this.findElementWithText('요청이 너무 많습니다'));
  if (rateLimited) {
    throw new RateLimitError('Wanted rate limit detected', {
      platform: 'wanted',
      retryAfterMs: 15000,
    });
  }

  const applyButton =
    (await this.findByText('button', '지원하기')) ||
    (await this.findByText('a', '지원하기')) ||
    (await this.findByText('button', 'Apply'));
  if (!applyButton) {
    try {
      await this.page.screenshot({ path: `/tmp/wanted-debug-${Date.now()}.png` });
    } catch (screenshotError) {
      this.logger.error('[debug-screenshot] Wanted:', screenshotError.message);
    }
    throw new ValidationError('Apply button not found', { platform: 'wanted' });
  }

  await applyButton.click();
  await new Promise((r) => setTimeout(r, 1000));

  const resumeOption = await this.page.$('.resume-item');
  if (resumeOption) {
    await resumeOption.click();
  }

  const submitButton = await this.findByText('button', '제출');
  if (submitButton) {
    await submitButton.click();
    await new Promise((r) => setTimeout(r, 2000));
  }

  const successMessage = await this.findElementWithText('지원이 완료되었습니다');

  if (successMessage) {
    const application = this.appManager.addApplication(job);
    this.appManager.updateStatus(
      application.id,
      APPLICATION_STATUS.APPLIED,
      'Auto-applied via bot'
    );

    notifications
      .notifyApplySuccess(job.company, job.title, job.sourceUrl, 'wanted')
      .catch(() => {});

    return { success: true, application };
  }

  throw new ValidationError('Application confirmation not found', { platform: 'wanted' });
}

export async function applyToWanted(job) {
  try {
    return await withRetry(() => executeWantedApply.call(this, job), {
      ...RETRY_CONFIG,
      logger: this.logger,
      classifyError: classifyWantedError,
      reporter: createRetryReporter(this, job),
    });
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    notifications
      .notifyApplyFailed(job.company, job.title, job.sourceUrl, normalizedError.message, 'wanted')
      .catch(() => {});
    return { success: false, error: normalizedError.message };
  }
}
