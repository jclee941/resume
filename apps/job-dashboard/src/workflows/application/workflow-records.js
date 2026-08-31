export function createWorkflowRecord(event, triggerType) {
  return {
    id: resolveWorkflowId(event),
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

function resolveWorkflowId(event) {
  const runId = typeof event?.payload?.runId === 'string' ? event.payload.runId.trim() : '';
  if (runId) return runId;
  if (event?.instanceId) return event.instanceId;
  if (event?.id) return event.id;
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `application-workflow-${Date.now()}`;
}

export function averageScore(scoredJobs) {
  return scoredJobs.reduce((sum, job) => sum + job.matchScore, 0) / scoredJobs.length || 0;
}

export function completeWorkflow(workflow) {
  workflow.status =
    workflow.stats.jobsFailed > 0 && workflow.stats.jobsApplied === 0 ? 'failed' : 'completed';
  workflow.completedAt = new Date().toISOString();
}
