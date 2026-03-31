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
  platform: 'saramin',
  maxRetries: 5,
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
        `[retry:saramin] ${event} for ${job.company}/${job.title} (successRate=${successRate ?? 0})`
      );
    }
  };
}

function classifySaraminError(error) {
  return classifyApplyError(error, { platform: 'saramin' });
}

async function executeSaraminApply(job) {
  await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2000));

  const loginLink =
    (await this.findByText('a', '로그인')) ||
    (await this.findByText('a', 'Sign in')) ||
    (await this.findByText('button', '로그인')) ||
    (await this.findByText('button', 'Sign in'));
  if (loginLink) {
    throw new AuthError('Not logged in to Saramin', { platform: 'saramin' });
  }

  const captchaChallenge =
    (await this.findElementWithText('captcha')) ||
    (await this.findElementWithText('로봇이 아닙니다')) ||
    (await this.findElementWithText('자동입력방지'));
  if (captchaChallenge) {
    throw new CaptchaError('Saramin captcha challenge detected', { platform: 'saramin' });
  }

  const rateLimited =
    (await this.findElementWithText('잠시 후 다시 시도')) ||
    (await this.findElementWithText('too many requests')) ||
    (await this.findElementWithText('요청이 너무 많습니다'));
  if (rateLimited) {
    throw new RateLimitError('Saramin rate limit detected', {
      platform: 'saramin',
      retryAfterMs: 20000,
    });
  }

  const applyButton =
    (await this.findByText('a', '입사지원', 'button.btn_apply')) ||
    (await this.findByText('button', '입사지원')) ||
    (await this.findByText('a', '지원하기')) ||
    (await this.findByText('button', '지원하기')) ||
    (await this.page.$('.btn_apply')) ||
    (await this.page.$('[class*="apply"]'));
  if (!applyButton) {
    try {
      await this.page.screenshot({ path: `/tmp/saramin-debug-${Date.now()}.png` });
    } catch (screenshotError) {
      this.logger.error('[debug-screenshot] Saramin:', screenshotError.message);
    }
    throw new ValidationError('Apply button not found', { platform: 'saramin' });
  }

  await applyButton.click();
  await new Promise((r) => setTimeout(r, 3000));

  const alreadyApplied = await this.findElementWithText('이미 지원한');
  if (alreadyApplied) {
    throw new ValidationError('Already applied to this job', { platform: 'saramin' });
  }

  const confirmButton =
    (await this.findByText('button', '확인', '.btn_apply_submit')) ||
    (await this.findByText('button', '지원하기'));

  if (confirmButton) {
    await confirmButton.click();
    await new Promise((r) => setTimeout(r, 3000));
  }

  const successMessage =
    (await this.findElementWithText('지원이 완료')) ||
    (await this.findElementWithText('지원 완료')) ||
    (await this.findElementWithText('지원하였습니다'));

  const errorMessage =
    (await this.findElementWithText('오류')) ||
    (await this.findElementWithText('실패')) ||
    (await this.findElementWithText('지원할 수 없습니다'));

  if (errorMessage) {
    throw new ValidationError('Application error detected on page', { platform: 'saramin' });
  }
  if (!successMessage) {
    throw new ValidationError(
      'Saramin application confirmation not found — no success signal detected',
      {
        platform: 'saramin',
      }
    );
  }

  const application = this.appManager.addApplication(job);
  this.appManager.updateStatus(
    application.id,
    APPLICATION_STATUS.APPLIED,
    'Auto-applied via bot (Saramin)'
  );

  return { success: true, application };
}

export async function applyToSaramin(job) {
  try {
    return await withRetry(() => executeSaraminApply.call(this, job), {
      ...RETRY_CONFIG,
      logger: this.logger,
      classifyError: classifySaraminError,
      reporter: createRetryReporter(this, job),
    });
  } catch (error) {
    const normalizedError = classifySaraminError(error);
    notifications
      .notifyApplyFailed(job.company, job.title, job.sourceUrl, normalizedError.message, 'saramin')
      .catch(() => {});
    return { success: false, error: normalizedError.message };
  }
}
