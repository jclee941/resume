/**
 * @typedef {{
 *   success?: boolean;
 *   skipped?: boolean;
 *   applied?: boolean;
 *   [key: string]: unknown;
 * }} ApplyResult
 */

/**
 * @param {unknown} job
 */
export function createDryRunResult(job) {
  return { job, success: true, dryRun: true, skipped: true, message: 'Would apply' };
}

/**
 * @param {unknown} job
 */
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

/**
 * @param {ApplyResult[]} results
 * @param {number} preSkippedCount
 */
export function countApplyResults(results, preSkippedCount) {
  return {
    applied: results.filter(
      (result) => result.success && !result.skipped && result.applied !== false
    ).length,
    failed: results.filter((result) => !result.success && !result.skipped).length,
    skipped:
      preSkippedCount +
      results.filter((result) => result.skipped || (result.success && result.applied === false))
        .length,
  };
}
