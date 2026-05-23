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


/**
 * @typedef {Object} ListOptions
 * @property {string} [status]
 * @property {string} [source]
 * @property {string} [company]
 * @property {string} [sortBy='createdAt']
 * @property {string} [sortOrder='desc']
 * @property {number} [limit=100]
 * @property {number} [offset=0]
 * @property {string} [fromDate]
 */

/**
 * @typedef {Object} ApplicationResult
 * @property {boolean} success
 * @property {Object} [application]
 * @property {Array} [applications]
 * @property {number} [total]
 * @property {string} [error]
 * @property {number} [statusCode]
 */

/**
 * @typedef {Object} ApplicationManagerPort
 * @property {(options: Object) => Array} listApplications
 * @property {(id: string) => Object|null} getApplication
 * @property {(job: Object, options?: Object) => Object} addApplication
 * @property {() => void} save
 * @property {(id: string, status: string, note?: string) => Object} updateStatus
 * @property {(id: string) => Object} deleteApplication
 * @property {() => Object} cleanupExpired
 */

/**
 * @typedef {Object} ApplicationServiceDependencies
 * @property {ApplicationManagerPort} manager
 */