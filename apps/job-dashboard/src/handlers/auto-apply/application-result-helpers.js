import { getDecisionTrace } from './decision-trace.js';

/**
 * @typedef {Object} SearchResultPlatformStats
 * @property {number} applied
 * @property {number} [searched]
 * @property {number} [matched]
 * @property {number} [skipped]
 * @property {number} [errors]
 */

/**
 * @typedef {Object} SearchResults
 * @property {Array<Record<string, unknown>>} jobs
 * @property {Record<string, SearchResultPlatformStats>} byPlatform
 * @property {number} [searched]
 * @property {number} [matched]
 * @property {number} [applied]
 * @property {number} [skipped]
 * @property {number} [errors]
 */

/**
 * @typedef {Object} JobResultInput
 * @property {string} [id]
 * @property {string} [sourceId]
 * @property {string} [source]
 * @property {string} [position]
 * @property {string} [title]
 * @property {string} [company]
 * @property {number} [matchScore]
 * @property {string} [sourceUrl]
 * @property {string} [url]
 * @property {boolean} [adapterBacked]
 * @property {unknown} [decisionTrace]
 */

/**
 * @param {SearchResults} searchResults
 * @param {JobResultInput} job
 * @param {string} action
 */
export function addJobResult(searchResults, job, action) {
  searchResults.jobs.push({
    id: job.sourceId || job.id,
    source: job.source,
    position: job.position || job.title,
    company: job.company,
    matchScore: job.matchScore,
    sourceUrl: job.sourceUrl,
    url: job.sourceUrl || job.url,
    action,
    adapterBacked: job.adapterBacked === true,
    decisionTrace: getDecisionTrace(job),
  });
}

/**
 * @param {SearchResults} searchResults
 * @param {string} source
 */
export function incrementPlatformApplied(searchResults, source) {
  if (searchResults.byPlatform[source]) {
    searchResults.byPlatform[source].applied++;
  }
}

/**
 * @typedef {Object} HumanApproval
 * @property {string} [status]
 * @property {string} [destination]
 */

/**
 * @typedef {Object} JobWithHumanApproval
 * @property {HumanApproval} [humanApproval]
 * @property {{ humanApproval?: HumanApproval }} [workflowApprovalMetadata]
 * @property {{ humanApproval?: HumanApproval }} [approvalMetadata]
 */

/**
 * @param {JobWithHumanApproval | null | undefined} job
 * @param {string} destination
 * @returns {boolean}
 */
export function hasHumanApprovalForDestination(job, destination) {
  const approval =
    job?.humanApproval ||
    job?.workflowApprovalMetadata?.humanApproval ||
    job?.approvalMetadata?.humanApproval;
  return approval?.status === 'approved' && approval?.destination === destination;
}
