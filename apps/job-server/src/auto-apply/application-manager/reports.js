import { APPLICATION_STATUS } from './status.js';

/**
 * @typedef {object} ApplicationTimelineItem
 * @property {string} status
 * @property {string} timestamp
 * @property {string} [previousStatus]
 * @property {string} [note]
 */

/**
 * @typedef {object} ApplicationRecord
 * @property {string} id
 * @property {string} jobId
 * @property {string} source
 * @property {string} [sourceUrl]
 * @property {string} position
 * @property {string} company
 * @property {string} [location]
 * @property {number} [matchScore]
 * @property {string} status
 * @property {string} [priority]
 * @property {string | null} [resumeId]
 * @property {string | null} [coverLetter]
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string | null} [appliedAt]
 * @property {ApplicationTimelineItem[]} timeline
 */

/**
 * @typedef {object} ApplicationStats
 * @property {number} totalApplications
 * @property {Record<string, number>} byStatus
 * @property {Record<string, number>} bySource
 * @property {Record<string, number>} byCompany
 * @property {Record<string, number>} byDate
 * @property {string | null} lastUpdated
 */

/**
 * @typedef {object} DailyReport
 * @property {string} date
 * @property {number} newApplications
 * @property {number} applied
 * @property {number} statusChanges
 * @property {number} pending
 * @property {number} active
 * @property {number} total
 */

/**
 * @param {ApplicationRecord[]} applications
 * @param {ApplicationStats} stats
 * @param {ApplicationRecord[]} activeApplications
 * @param {string} date
 * @returns {DailyReport}
 */
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
