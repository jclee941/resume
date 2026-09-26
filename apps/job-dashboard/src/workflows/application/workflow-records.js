/**
 * @typedef {Object} WorkflowEvent
 * @property {{ runId?: string }} [payload]
 * @property {string} [instanceId]
 * @property {string} [id]
 */

/**
 * @typedef {Object} WorkflowStats
 * @property {number} jobsFound
 * @property {number} jobsScored
 * @property {number} jobsApproved
 * @property {number} jobsRejected
 * @property {number} jobsApplied
 * @property {number} jobsFailed
 */

/**
 * @typedef {Object} WorkflowRecord
 * @property {string} id
 * @property {string} triggerType
 * @property {string} status
 * @property {string} startedAt
 * @property {string} [completedAt]
 * @property {unknown[]} steps
 * @property {WorkflowStats} stats
 * @property {unknown[]} errors
 */

/**
 * @param {WorkflowEvent | null | undefined} event
 * @param {string} triggerType
 * @returns {WorkflowRecord}
 */
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

/**
 * @param {WorkflowEvent | null | undefined} event
 * @returns {string}
 */
function resolveWorkflowId(event) {
  const runId = typeof event?.payload?.runId === 'string' ? event.payload.runId.trim() : '';
  if (runId) return runId;
  if (event?.instanceId) return event.instanceId;
  if (event?.id) return event.id;
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `application-workflow-${Date.now()}`;
}

/**
 * @param {Array<{ matchScore: number }>} scoredJobs
 * @returns {number}
 */
export function averageScore(scoredJobs) {
  return scoredJobs.reduce((sum, job) => sum + job.matchScore, 0) / scoredJobs.length || 0;
}

/**
 * @param {WorkflowRecord} workflow
 * @returns {void}
 */
export function completeWorkflow(workflow) {
  workflow.status =
    workflow.stats.jobsFailed > 0 && workflow.stats.jobsApplied === 0 ? 'failed' : 'completed';
  workflow.completedAt = new Date().toISOString();
}
