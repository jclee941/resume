import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getEscalationLevel, getStatusLabel } from './health-check/evaluation.js';
import { getConsecutiveFailures } from './health-check/metrics.js';
import { runHealthCheckWorkflow } from './health-check/orchestration.js';

/**
 * Health Check Workflow
 *
 * Monitors service health with automatic alerting and metrics logging.
 * Parallel health checks with latency tracking and degradation detection.
 *
 * @param {Object} params
 * @param {string[]} params.services - URLs to check (defaults to resume.jclee.me and resume.jclee.me/job)
 */
export class HealthCheckWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    return runHealthCheckWorkflow(this, event, step);
  }

  async getConsecutiveFailures() {
    return getConsecutiveFailures(this.env);
  }

  getEscalationLevel(consecutiveFailures) {
    return getEscalationLevel(consecutiveFailures);
  }

  getStatusLabel(result) {
    return getStatusLabel(result);
  }
}
