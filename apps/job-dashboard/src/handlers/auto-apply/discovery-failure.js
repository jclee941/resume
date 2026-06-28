export function isFailedDiscoveryRun(explicitCandidates, allJobs, searchResults) {
  return (
    !explicitCandidates.hasExplicitCandidates &&
    searchResults.searchFailures > 0 &&
    searchResults.searchAttempts === searchResults.searchFailures &&
    allJobs.length === 0 &&
    searchResults.jobs.length === 0
  );
}
