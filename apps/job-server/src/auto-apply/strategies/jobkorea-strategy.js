import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';

export async function applyToJobKorea(job) {
  try {
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
        return { success: false, error: 'Not logged in — session cookies expired or invalid' };
      }
      await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 2000));
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
      } catch (e) {
        this.logger.error('[debug-screenshot] JobKorea:', e.message);
      }
      return { success: false, error: 'Apply button not found' };
    }
    await applyButton.click();
    await new Promise((r) => setTimeout(r, 3000));

    const alreadyApplied = await this.findElementWithText('이미 지원한');
    if (alreadyApplied) {
      return { success: false, error: 'Already applied to this job' };
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
      return { success: false, error: 'Application error detected on page' };
    }
    if (!successMessage) {
      return {
        success: false,
        error: 'JobKorea application confirmation not found — no success signal detected',
      };
    }

    const application = this.appManager.addApplication(job);
    this.appManager.updateStatus(
      application.id,
      APPLICATION_STATUS.APPLIED,
      'Auto-applied via bot (JobKorea)'
    );

    return { success: true, application };
  } catch (error) {
    notifications.notifyApplyFailed(job.company, job.title, job.sourceUrl, error.message, 'jobkorea').catch(() => {});
    return { success: false, error: error.message };
  }
}
