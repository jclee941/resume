import { APPLICATION_STATUS } from './status.js';

const EXPIRATION_DAYS = 30;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export function expirePendingApplications(applications, now = new Date()) {
  let cleaned = 0;

  for (const application of applications) {
    if (application.status !== APPLICATION_STATUS.PENDING) {
      continue;
    }

    const created = new Date(application.createdAt);
    const daysPending = (now - created) / MILLISECONDS_PER_DAY;

    if (daysPending > EXPIRATION_DAYS) {
      application.status = APPLICATION_STATUS.EXPIRED;
      application.updatedAt = now.toISOString();
      application.timeline.push({
        status: APPLICATION_STATUS.EXPIRED,
        timestamp: now.toISOString(),
        note: 'Auto-expired after 30 days',
      });
      cleaned++;
    }
  }

  return cleaned;
}
