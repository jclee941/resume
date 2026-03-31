import { APPLICATION_STATUS } from '../application-manager.js';
import { n8n } from '../../shared/services/n8n/index.js';

export async function applyToWanted(job) {
  try {
    await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2000));

    const loginLink =
      (await this.findByText('a', '로그인')) ||
      (await this.findByText('a', 'Sign in')) ||
      (await this.findByText('button', '로그인')) ||
      (await this.findByText('button', 'Sign in'));
    if (loginLink) {
      return { success: false, error: 'Not logged in to Wanted' };
    }

    const applyButton =
      (await this.findByText('button', '지원하기')) ||
      (await this.findByText('a', '지원하기')) ||
      (await this.findByText('button', 'Apply'));
    if (!applyButton) {
      try {
        await this.page.screenshot({ path: `/tmp/wanted-debug-${Date.now()}.png` });
      } catch (e) {
        this.logger.error('[debug-screenshot] Wanted:', e.message);
      }
      return { success: false, error: 'Apply button not found' };
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

      n8n.notifyApplySuccess(job.company, job.title, job.sourceUrl, 'wanted').catch(() => {});

      return { success: true, application };
    }

    n8n
      .notifyApplyFailed(
        job.company,
        job.title,
        job.sourceUrl,
        'Application confirmation not found',
        'wanted'
      )
      .catch(() => {});
    return { success: false, error: 'Application confirmation not found' };
  } catch (error) {
    n8n
      .notifyApplyFailed(job.company, job.title, job.sourceUrl, error.message, 'wanted')
      .catch(() => {});
    return { success: false, error: error.message };
  }
}
