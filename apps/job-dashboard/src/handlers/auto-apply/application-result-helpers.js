import { getDecisionTrace } from './decision-trace.js';

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

export function incrementPlatformApplied(searchResults, source) {
  if (searchResults.byPlatform[source]) {
    searchResults.byPlatform[source].applied++;
  }
}

export function hasHumanApprovalForDestination(job, destination) {
  const approval =
    job?.humanApproval ||
    job?.workflowApprovalMetadata?.humanApproval ||
    job?.approvalMetadata?.humanApproval;
  return approval?.status === 'approved' && approval?.destination === destination;
}
