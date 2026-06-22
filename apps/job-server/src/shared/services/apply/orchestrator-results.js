export function createDryRunResult(job) {
  return { job, success: true, dryRun: true, skipped: true, message: 'Would apply' };
}

export function createDryRunOnlyResult(job) {
  return {
    job,
    success: true,
    dryRun: true,
    dryRunOnly: true,
    skipped: true,
    message: 'Submission skipped: dry-run only',
  };
}

export function countApplyResults(results, preSkippedCount) {
  return {
    applied: results.filter((result) => result.success && !result.skipped).length,
    failed: results.filter((result) => !result.success && !result.skipped).length,
    skipped: preSkippedCount + results.filter((result) => result.skipped).length,
  };
}
