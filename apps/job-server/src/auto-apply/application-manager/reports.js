import { APPLICATION_STATUS } from './status.js';

export function generateDailyReport(applications, stats, activeApplications, date) {
  const dayApps = applications.filter(
    (application) =>
      application.createdAt.startsWith(date) || application.updatedAt.startsWith(date)
  );
  const applied = dayApps.filter(
    (application) => application.appliedAt && application.appliedAt.startsWith(date)
  ).length;
  const statusChanges = dayApps.filter((application) =>
    application.timeline.some(
      (timelineItem) => timelineItem.timestamp.startsWith(date) && timelineItem.previousStatus
    )
  );

  return {
    date,
    newApplications: dayApps.filter((application) => application.createdAt.startsWith(date)).length,
    applied,
    statusChanges: statusChanges.length,
    pending: stats.byStatus[APPLICATION_STATUS.PENDING] || 0,
    active: activeApplications.length,
    total: stats.totalApplications,
  };
}
