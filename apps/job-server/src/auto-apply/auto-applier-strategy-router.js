/**
 * @typedef {object} ApplyResult
 * @property {boolean} success
 * @property {boolean} [applied]
 * @property {boolean} [skipped]
 * @property {string} [status]
 * @property {string | null} [applicationId]
 * @property {boolean} [retryable]
 * @property {string} [error]
 */

/**
 * @typedef {object} JobWithSource
 * @property {string} source
 * @property {string | number} [id]
 * @property {string} [company]
 * @property {string} [position]
 */

/**
 * @typedef {object} StrategyHost
 * @property {(job: JobWithSource) => Promise<ApplyResult>} applyToWanted
 * @property {(job: JobWithSource) => Promise<ApplyResult>} applyToJobKorea
 * @property {(job: JobWithSource) => Promise<ApplyResult>} applyToSaramin
 * @property {(job: JobWithSource) => Promise<ApplyResult>} applyToLinkedIn
 */

/**
 * @this {StrategyHost}
 * @param {JobWithSource} job
 * @returns {Promise<ApplyResult>}
 */
export async function applyToJob(job) {
  const source = job.source;

  switch (source) {
    case 'wanted':
      return this.applyToWanted(job);
    case 'jobkorea':
      return this.applyToJobKorea(job);
    case 'saramin':
      return this.applyToSaramin(job);
    case 'linkedin':
      return this.applyToLinkedIn(job);
    default:
      return { success: false, error: `Unsupported source: ${source}` };
  }
}
