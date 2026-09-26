/**
 * @template {Record<string, unknown>} T
 * @param {T} job
 * @param {unknown} entry
 * @returns {T & { decisionTrace: unknown[] }}
 */
export function appendDecisionTrace(job, entry) {
  return {
    ...job,
    decisionTrace: [...getDecisionTrace(job), entry],
  };
}

/**
 * @param {{ decisionTrace?: unknown } | null | undefined} [job]
 * @returns {unknown[]}
 */
export function getDecisionTrace(job) {
  return Array.isArray(job?.decisionTrace) ? job.decisionTrace : [];
}
