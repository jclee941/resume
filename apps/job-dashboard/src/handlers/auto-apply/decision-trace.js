export function appendDecisionTrace(job, entry) {
  return {
    ...job,
    decisionTrace: [...getDecisionTrace(job), entry],
  };
}

export function getDecisionTrace(job) {
  return Array.isArray(job?.decisionTrace) ? job.decisionTrace : [];
}
