import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getEscalationLevel, getStatusLabel } from './health-check/evaluation.js';
import { getConsecutiveFailures } from './health-check/metrics.js';
import { runHealthCheckWorkflow } from './health-check/orchestration.js';

/**
 * @typedef {import('./health-check/probes.js').HealthCheckEnv &
 *   import('./health-check/metrics.js').HealthWorkflowEnv} HealthCheckEnv
 * @typedef {{ services?: string[] }} HealthCheckParams
 */

/**
 * Health Check Workflow
 *
 * Monitors service health with automatic alerting and metrics logging.
 * Parallel health checks with latency tracking and degradation detection.
 * Payload `services` lists the URLs to check (defaults to resume.jclee.me and
 * resume.jclee.me/job).
 *
 * @extends {WorkflowEntrypoint<HealthCheckEnv, HealthCheckParams>}
 */
export class HealthCheckWorkflow extends WorkflowEntrypoint {
  /**
   * @param {import('cloudflare:workers').WorkflowEvent<HealthCheckParams>} event
   * @param {import('cloudflare:workers').WorkflowStep} step
   */
  async run(event, step) {
    return runHealthCheckWorkflow(this, event, step);
  }

  async getConsecutiveFailures() {
    return getConsecutiveFailures(this.env);
  }

  /** @param {number} consecutiveFailures */
  getEscalationLevel(consecutiveFailures) {
    return getEscalationLevel(consecutiveFailures);
  }

  /** @param {import('./health-check/evaluation.js').ServiceResult} result */
  getStatusLabel(result) {
    return getStatusLabel(result);
  }
}
