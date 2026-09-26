import { APPLICATION_STATUS } from './status.js';

/**
 * @typedef {{
 *   totalApplications: number;
 *   byStatus: Record<string, number>;
 *   bySource: Record<string, number>;
 *   byCompany: Record<string, number>;
 *   byDate: Record<string, number>;
 *   lastUpdated: string | null;
 * }} ApplicationStats
 */

/**
 * @typedef {{
 *   status: string;
 *   source: string;
 *   company: string;
 *   createdAt: string;
 *   appliedAt?: string | null;
 *   timeline: Array<{ status: string; timestamp: string }>;
 * }} ApplicationItem
 */

/**
 * @returns {ApplicationStats}
 */
export function initStats() {
  return {
    totalApplications: 0,
    byStatus: {},
    bySource: {},
    byCompany: {},
    byDate: {},
    lastUpdated: null,
  };
}

/**
 * @param {ApplicationItem[]} applications
 * @returns {ApplicationStats}
 */
export function buildStats(applications) {
  const stats = initStats();
  stats.totalApplications = applications.length;

  for (const application of applications) {
    stats.byStatus[application.status] = (stats.byStatus[application.status] || 0) + 1;
    stats.bySource[application.source] = (stats.bySource[application.source] || 0) + 1;
    stats.byCompany[application.company] = (stats.byCompany[application.company] || 0) + 1;

    const date = application.createdAt.split('T')[0];
    stats.byDate[date] = (stats.byDate[date] || 0) + 1;
  }

  stats.lastUpdated = new Date().toISOString();
  return stats;
}

/**
 * @param {ApplicationItem[]} applications
 * @returns {number}
 */
export function calculateSuccessRate(applications) {
  const completed = applications.filter((application) =>
    [APPLICATION_STATUS.OFFER, APPLICATION_STATUS.REJECTED].includes(application.status)
  );

  if (completed.length === 0) return 0;

  const offers = completed.filter(
    (application) => application.status === APPLICATION_STATUS.OFFER
  ).length;
  return Math.round((offers / completed.length) * 100);
}

/**
 * @param {ApplicationItem[]} applications
 * @returns {number}
 */
export function calculateResponseRate(applications) {
  const applied = applications.filter((application) => application.appliedAt);
  if (applied.length === 0) return 0;

  const responded = applied.filter(
    (application) =>
      application.status !== APPLICATION_STATUS.APPLIED &&
      application.status !== APPLICATION_STATUS.PENDING
  ).length;
  return Math.round((responded / applied.length) * 100);
}

/**
 * @param {ApplicationItem[]} applications
 * @returns {number | null}
 */
export function calculateAverageResponseTime(applications) {
  const responded = applications.filter((application) => {
    if (!application.appliedAt) return false;
    const responseEvent = findResponseEvent(application);
    return !!responseEvent;
  });

  if (responded.length === 0) return null;

  const totalDays = responded.reduce((sum, application) => {
    const appliedDate = /** @type {Date & number} */ (
      new Date(/** @type {string} */ (application.appliedAt))
    );
    const responseEvent = findResponseEvent(application);
    const responseDate = /** @type {Date & number} */ (
      new Date(/** @type {{ timestamp: string }} */ (responseEvent).timestamp)
    );
    const days = (responseDate - appliedDate) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round(totalDays / responded.length);
}

/**
 * @param {ApplicationStats} stats
 * @param {ApplicationItem[]} applications
 * @returns {ApplicationStats & {
 *   successRate: number;
 *   responseRate: number;
 *   averageResponseTime: number | null;
 * }}
 */
export function withCalculatedStats(stats, applications) {
  return {
    ...stats,
    successRate: calculateSuccessRate(applications),
    responseRate: calculateResponseRate(applications),
    averageResponseTime: calculateAverageResponseTime(applications),
  };
}

/**
 * @param {ApplicationItem} application
 * @returns {{ status: string; timestamp: string } | undefined}
 */
function findResponseEvent(application) {
  return application.timeline.find(
    (timelineItem) =>
      timelineItem.status !== APPLICATION_STATUS.APPLIED &&
      timelineItem.status !== APPLICATION_STATUS.PENDING
  );
}
