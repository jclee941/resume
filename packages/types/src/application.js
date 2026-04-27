/**
 * @typedef {Object} Application
 * @property {string} id
 * @property {string} jobId
 * @property {string} platform
 * @property {string} company
 * @property {string} position
 * @property {ApplicationStatus} status
 * @property {string} appliedAt
 * @property {string} [updatedAt]
 * @property {Object} [metadata]
 */

/**
 * @typedef {'pending' | 'applied' | 'reviewing' | 'interview' | 'offer' | 'rejected' | 'withdrawn'} ApplicationStatus
 */

export const APPLICATION_STATUSES = Object.freeze([
  'pending',
  'applied',
  'reviewing',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isValidApplicationStatus(status) {
  return APPLICATION_STATUSES.includes(status);
}
