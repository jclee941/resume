/**
 * @typedef {object} CandidateJob
 * @property {string} id
 * @property {string} company
 * @property {string} position
 * @property {string} source
 * @property {string} [location]
 * @property {string} [sourceUrl]
 * @property {number} matchPercentage
 * @property {string} tier
 */

/**
 * @typedef {object} SubmitQueueItem
 * @property {string} id
 * @property {string} company
 * @property {string} position
 * @property {string} source
 * @property {string} location
 * @property {string} url
 * @property {string} loginPlatform
 * @property {boolean} needsHumanLogin
 * @property {string} status
 * @property {number} matchScore
 * @property {number} matchPercentage
 * @property {string} tier
 */

/**
 * @typedef {object} SubmitQueueOptions
 * @property {string[]} [tiers]
 */

/**
 * @param {CandidateJob[]} candidates
 * @param {SubmitQueueOptions} [options={}]
 * @returns {SubmitQueueItem[]}
 */
export function buildSubmitQueue(candidates, options = {}) {
  const tiers = options.tiers || ['auto'];
  return candidates
    .filter((job) => tiers.includes(job.tier))
    .map((job) => ({
      id: job.id,
      company: job.company,
      position: job.position,
      source: job.source,
      location: job.location || '',
      url: job.sourceUrl || '',
      loginPlatform: job.source,
      needsHumanLogin: true,
      status: 'ready-pending-review',
      matchScore: job.matchPercentage,
      matchPercentage: job.matchPercentage,
      tier: job.tier,
    }));
}
