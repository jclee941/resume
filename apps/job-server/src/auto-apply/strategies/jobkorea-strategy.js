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
  platform: 'jobkorea',
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
        `[retry:jobkorea] ${event} for ${job.company}/${job.title} (successRate=${successRate ?? 0})`
      );
    }
  };
}

function classifyJobKoreaError(error) {
  return classifyApplyError(error, { platform: 'jobkorea' });
}

async function executeJobKoreaApply(job) {
  await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2000));

  const pageTitle = await this.page.title();
  this.logger.info(`  📄 JobKorea page: ${pageTitle} — ${job.sourceUrl}`);

  const loginLink = await this.findByText('a', '로그인');
  if (loginLink) {
    this.logger.info('  ⚠️ JobKorea: NOT logged in despite cookies — trying cookie refresh...');
    await this.page.goto('https://www.jobkorea.co.kr', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2000));
    const stillLoggedOut = await this.findByText('a', '로그인');
    if (stillLoggedOut) {
      this.logger.info('  ❌ JobKorea: Login failed — cookies may be expired');
      throw new AuthError('Not logged in — session cookies expired or invalid', {
        platform: 'jobkorea',
      });
    }
    await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2000));
  }

  const captchaChallenge =
    (await this.findElementWithText('captcha')) ||
    (await this.findElementWithText('로봇이 아닙니다')) ||
    (await this.findElementWithText('자동입력방지'));
  if (captchaChallenge) {
    throw new CaptchaError('JobKorea captcha challenge detected', { platform: 'jobkorea' });
  }

  const rateLimited =
    (await this.findElementWithText('잠시 후 다시 시도')) ||
    (await this.findElementWithText('too many requests')) ||
    (await this.findElementWithText('요청이 너무 많습니다'));
  if (rateLimited) {
    throw new RateLimitError('JobKorea rate limit detected', {
      platform: 'jobkorea',
      retryAfterMs: 20000,
    });
  }

  const applyButton =
    (await this.findByText('button', '즉시 지원')) ||
    (await this.findByText('a', '즉시 지원')) ||
    (await this.findByText('button', '즉시지원')) ||
    (await this.findByText('a', '즉시지원')) ||
    (await this.findByText('button', '잡코리아 즉시지원')) ||
    (await this.findByText('a', '잡코리아 즉시지원')) ||
    (await this.findByText('button', '입사지원')) ||
    (await this.findByText('a', '입사지원')) ||
    (await this.findByText('button', '지원하기')) ||
    (await this.findByText('a', '지원하기')) ||
    (await this.page.$('[class*="contained-primary"]')) ||
    (await this.page.$('[class*="btn_apply"]')) ||
    (await this.page.$('[class*="apply"]'));
  if (!applyButton) {
    try {
      await this.page.screenshot({ path: `/tmp/jobkorea-debug-${Date.now()}.png` });
    } catch (screenshotError) {
      this.logger.error('[debug-screenshot] JobKorea:', screenshotError.message);
    }
    throw new ValidationError('Apply button not found', { platform: 'jobkorea' });
  }
  await applyButton.click();
  await new Promise((r) => setTimeout(r, 3000));

  const alreadyApplied = await this.findElementWithText('이미 지원한');
  if (alreadyApplied) {
    throw new ValidationError('Already applied to this job', { platform: 'jobkorea' });
  }

  const resumeSelect =
    (await this.page.$('.resume_select')) || (await this.page.$('.apply_resume_list'));
  if (resumeSelect) {
    const firstResume =
      (await this.page.$('.resume_item:first-child')) ||
      (await this.page.$('input[type="radio"]:first-child'));
    if (firstResume) await firstResume.click();
  }

  const finalSubmit =
    (await this.findByText('button', '지원하기', '#btnApplyDirect')) ||
    (await this.page.$('.btn_apply_confirm'));

  if (finalSubmit) {
    await finalSubmit.click();
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
    throw new ValidationError('Application error detected on page', { platform: 'jobkorea' });
  }
  if (!successMessage) {
    throw new ValidationError(
      'JobKorea application confirmation not found — no success signal detected',
      {
        platform: 'jobkorea',
      }
    );
  }

  const application = this.appManager.addApplication(job);
  this.appManager.updateStatus(
    application.id,
    APPLICATION_STATUS.APPLIED,
    'Auto-applied via bot (JobKorea)'
  );

  return { success: true, application };
}

export async function applyToJobKorea(job) {
  try {
    return await withRetry(() => executeJobKoreaApply.call(this, job), {
      ...RETRY_CONFIG,
      logger: this.logger,
      classifyError: classifyJobKoreaError,
      reporter: createRetryReporter(this, job),
    });
  } catch (error) {
    const normalizedError = classifyJobKoreaError(error);
    notifications
      .notifyApplyFailed(job.company, job.title, job.sourceUrl, normalizedError.message, 'jobkorea')
      .catch(() => {});
    return { success: false, error: normalizedError.message };
  }
}
