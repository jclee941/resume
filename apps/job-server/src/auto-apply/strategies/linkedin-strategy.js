import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';

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
    notifications
      .notifyApplyFailed(job.company, job.title, job.sourceUrl, error.message, 'linkedin')
      .catch(() => {});
    return { success: false, error: error.message };
  }
}
