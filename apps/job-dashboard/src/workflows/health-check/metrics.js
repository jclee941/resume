import { getEscalationLevel } from './evaluation.js';

/**
 * @typedef {Object} HealthEvaluatedService
 * @property {string} [url]
 * @property {number} [status]
 * @property {number} latencyMs
 * @property {boolean} healthy
 */

/**
 * @typedef {Object} HealthEvaluatedBinding
 * @property {boolean} healthy
 * @property {number} latencyMs
 */

/**
 * @typedef {Object} HealthEvaluationData
 * @property {string} overallHealth
 * @property {HealthEvaluatedService[]} services
 * @property {{ d1: HealthEvaluatedBinding, kv: HealthEvaluatedBinding }} bindings
 */

/**
 * @typedef {Object} HealthD1PreparedStatement
 * @property {(...params: unknown[]) => unknown} bind
 * @property {() => Promise<{ cnt?: number } | null>} first
 * @property {() => Promise<{ results?: Array<{ status?: string }> }>} all
 */

/**
 * @typedef {Object} HealthD1Database
 * @property {(query: string) => HealthD1PreparedStatement} prepare
 * @property {(batch: unknown[]) => Promise<unknown>} batch
 */

/**
 * @typedef {Object} HealthWorkflowEnv
 * @property {HealthD1Database} JOB_DB
 */

/**
 * @typedef {Object} HealthWorkflowInstance
 * @property {HealthWorkflowEnv} env
 * @property {() => Promise<number>} getConsecutiveFailures
 */

/**
 * @typedef {Object} MetricBatchOptions
 * @property {HealthD1PreparedStatement} detailStmt
 * @property {HealthEvaluationData} healthEvaluation
 * @property {number} consecutiveFailures
 * @property {string} escalationLevel
 */

/**
 * @param {HealthWorkflowInstance} workflow
 * @param {HealthEvaluationData} healthEvaluation
 */
export async function logHealthMetrics(workflow, healthEvaluation) {
  const detailStmt = workflow.env.JOB_DB.prepare(`
    INSERT INTO health_check_details (check_type, service_name, status, latency_ms, consecutive_failures, escalation_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const consecutiveFailures =
    healthEvaluation.overallHealth !== 'healthy'
      ? (await workflow.getConsecutiveFailures()) + 1
      : 0;
  const escalationLevel = getEscalationLevel(consecutiveFailures);
  const batch = buildHealthMetricBatch({
    detailStmt,
    healthEvaluation,
    consecutiveFailures,
    escalationLevel,
  });

  await workflow.env.JOB_DB.batch(batch);

  return { logged: batch.length, consecutiveFailures, escalationLevel };
}

/**
 * @param {MetricBatchOptions} options
 */
function buildHealthMetricBatch({
  detailStmt,
  healthEvaluation,
  consecutiveFailures,
  escalationLevel,
}) {
  return [
    ...healthEvaluation.services.map((service) =>
      detailStmt.bind(
        'http',
        service.url,
        service.healthy ? 'healthy' : 'down',
        service.latencyMs,
        consecutiveFailures,
        escalationLevel
      )
    ),
    detailStmt.bind(
      'd1',
      'JOB_DB',
      healthEvaluation.bindings.d1.healthy ? 'healthy' : 'down',
      healthEvaluation.bindings.d1.latencyMs,
      consecutiveFailures,
      escalationLevel
    ),
    detailStmt.bind(
      'kv',
      'SESSIONS',
      healthEvaluation.bindings.kv.healthy ? 'healthy' : 'down',
      healthEvaluation.bindings.kv.latencyMs,
      consecutiveFailures,
      escalationLevel
    ),
  ];
}

/**
 * Count the failed HTTP checks recorded since the last healthy one (capped at 20), so the
 * streak follows consecutive runs whatever the cron interval is.
 * @param {HealthWorkflowEnv} env
 */
export async function getConsecutiveFailures(env) {
  try {
    const { results = [] } = await env.JOB_DB.prepare(
      `
      SELECT status FROM health_check_details
      WHERE check_type = 'http'
      ORDER BY id DESC
      LIMIT 20
    `
    ).all();
    const lastHealthy = results.findIndex((row) => row.status === 'healthy');
    return lastHealthy === -1 ? results.length : lastHealthy;
  } catch {
    return 0;
  }
}
