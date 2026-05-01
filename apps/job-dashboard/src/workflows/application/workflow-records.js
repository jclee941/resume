export function createWorkflowRecord(event, triggerType) {
  return {
    id: event.instanceId,
    triggerType,
    status: 'running',
    startedAt: new Date().toISOString(),
    steps: [],
    stats: {
      jobsFound: 0,
      jobsScored: 0,
      jobsApproved: 0,
      jobsRejected: 0,
      jobsApplied: 0,
      jobsFailed: 0,
    },
    errors: [],
  };
}

export function averageScore(scoredJobs) {
  return scoredJobs.reduce((sum, job) => sum + job.matchScore, 0) / scoredJobs.length || 0;
}

export function completeWorkflow(workflow) {
  workflow.status =
    workflow.stats.jobsFailed > 0 && workflow.stats.jobsApplied === 0 ? 'failed' : 'completed';
  workflow.completedAt = new Date().toISOString();
}
