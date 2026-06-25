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
 * @typedef {'pending' | 'saved' | 'applied' | 'viewed' | 'in_progress' | 'interview' | 'offer' | 'rejected' | 'withdrawn' | 'expired'} ApplicationStatus
 */

export const APPLICATION_STATUSES = Object.freeze([
  'pending',
  'saved',
  'applied',
  'viewed',
  'in_progress',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'expired',
]);

/**
 * @typedef {'ashby' | 'greenhouse' | 'lever' | 'smartrecruiters' | 'teamtailor' | 'workday'} ForeignAtsPlatform
 */
export const FOREIGN_ATS_PLATFORMS = Object.freeze([
  'ashby',
  'greenhouse',
  'lever',
  'smartrecruiters',
  'teamtailor',
  'workday',
]);

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isValidApplicationStatus(status) {
  return APPLICATION_STATUSES.includes(status);
}

/**
 * @typedef {Object} ForeignAtsLocation
 * @property {string} countryCode ISO 3166-1 alpha-2 country code.
 * @property {string} [region]
 * @property {string} [city]
 * @property {boolean} [remote]
 */

/**
 * @typedef {Object} ForeignAtsSource
 * @property {ForeignAtsPlatform} platform
 * @property {string} sourceUrl
 * @property {string} [externalJobId]
 * @property {string} [requisitionId]
 * @property {ForeignAtsLocation} [location]
 */

/**
 * @typedef {Object} ForeignAtsApplicationPacketMetadata
 * @property {ForeignAtsSource} source
 * @property {string} capturedAt
 * @property {string} [externalApplicationId]
 * @property {ApplicationStatus} [status]
 * @property {Object} [raw]
 */

/**
 * @typedef {Object} ForeignAtsApplicationPacket
 * @property {ForeignAtsApplicationPacketMetadata} metadata
 * @property {Application} [application]
 */

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
