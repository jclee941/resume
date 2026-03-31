import { APPLICATION_STATUS } from '../application-manager.js';
import { n8n } from '../../shared/services/n8n/index.js';

export async function applyToSaramin(job) {
  try {
    await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2000));

    const loginLink =
      (await this.findByText('a', '로그인')) ||
      (await this.findByText('a', 'Sign in')) ||
      (await this.findByText('button', '로그인')) ||
      (await this.findByText('button', 'Sign in'));
    if (loginLink) {
      return { success: false, error: 'Not logged in to Saramin' };
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
      } catch (e) {
        this.logger.error('[debug-screenshot] Saramin:', e.message);
      }
      return { success: false, error: 'Apply button not found' };
    }

    await applyButton.click();
    await new Promise((r) => setTimeout(r, 3000));

    const alreadyApplied = await this.findElementWithText('이미 지원한');
    if (alreadyApplied) {
      return { success: false, error: 'Already applied to this job' };
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
      return { success: false, error: 'Application error detected on page' };
    }
    if (!successMessage) {
      return {
        success: false,
        error: 'Saramin application confirmation not found — no success signal detected',
      };
    }

    const application = this.appManager.addApplication(job);
    this.appManager.updateStatus(
      application.id,
      APPLICATION_STATUS.APPLIED,
      'Auto-applied via bot (Saramin)'
    );

    return { success: true, application };
  } catch (error) {
    n8n
      .notifyApplyFailed(job.company, job.title, job.sourceUrl, error.message, 'wanted')
      .catch(() => {});
    return { success: false, error: error.message };
  }
}
