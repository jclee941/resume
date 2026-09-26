import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';

/**
 * @typedef {{
 *   click(): Promise<void>,
 * }} ClickableElement
 *
 * @typedef {{
 *   goto(url: string, options?: { waitUntil?: string }): Promise<unknown>,
 * }} PageLike
 *
 * @typedef {{
 *   id?: string | number,
 *   [key: string]: unknown,
 * }} ApplicationRecord
 *
 * @typedef {{
 *   addApplication(job: LinkedInJob, details?: { notes?: string }): ApplicationRecord,
 *   updateStatus(id: string | number | undefined, status: string, notes?: string): unknown,
 * }} AppManagerLike
 *
 * @typedef {{
 *   page: PageLike,
 *   findByText(tag: string, text: string): Promise<ClickableElement | null>,
 *   findElementWithText(text: string): Promise<unknown>,
 *   appManager: AppManagerLike,
 * }} LinkedInStrategyHost
 *
 * @typedef {{
 *   sourceUrl: string,
 *   company?: string,
 *   title?: string,
 *   [key: string]: unknown,
 * }} LinkedInJob
 *
 * @typedef {{
 *   success: boolean,
 *   application?: ApplicationRecord,
 *   external?: boolean,
 *   error?: string,
 * }} LinkedInApplyResult
 */

/**
 * @this {LinkedInStrategyHost}
 * @param {LinkedInJob} job
 * @returns {Promise<LinkedInApplyResult>}
 */
export async function applyToLinkedIn(job) {
  try {
    await this.page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' });

    const easyApplyButton = await this.findByText('button', 'Easy Apply');
    if (!easyApplyButton) {
      const application = this.appManager.addApplication(job, {
        notes: 'External application required',
      });
      return { success: true, application, external: true };
    }

    await easyApplyButton.click();
    await new Promise((r) => setTimeout(r, 2000));

    let steps = 0;
    const MAX_STEPS = 10;

    while (steps < MAX_STEPS) {
      const nextButton =
        (await this.findByText('button', 'Next')) || (await this.findByText('button', 'Review'));

      if (nextButton) {
        await nextButton.click();
        await new Promise((r) => setTimeout(r, 1500));
        steps++;
        continue;
      }

      const submitButton = await this.findByText('button', 'Submit application');

      if (submitButton) {
        await submitButton.click();
        await new Promise((r) => setTimeout(r, 3000));
        break;
      }

      break;
    }

    const successMessage =
      (await this.findElementWithText('application was sent')) ||
      (await this.findElementWithText('Application submitted')) ||
      (await this.findElementWithText('Your application was sent')) ||
      (await this.findElementWithText('Application sent'));

    if (!successMessage) {
      notifications
        .notifyApplyFailed(
          job.company,
          job.title,
          job.sourceUrl,
          'Application confirmation not found',
          'linkedin'
        )
        .catch(() => {});
      return { success: false, error: 'Application confirmation not found' };
    }

    const application = this.appManager.addApplication(job);
    this.appManager.updateStatus(
      application.id,
      APPLICATION_STATUS.APPLIED,
      'Auto-applied via LinkedIn Easy Apply'
    );

    return { success: true, application };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notifications
      .notifyApplyFailed(job.company, job.title, job.sourceUrl, message, 'linkedin')
      .catch(() => {});
    return { success: false, error: message };
  }
}
