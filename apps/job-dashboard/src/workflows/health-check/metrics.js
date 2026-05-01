import { getEscalationLevel } from './evaluation.js';

export async function logHealthMetrics(workflow, healthEvaluation) {
  const healthStmt = workflow.env.JOB_DB.prepare(`
    INSERT INTO health_checks (service_url, status, latency_ms, checked_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

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
    healthStmt,
    detailStmt,
    healthEvaluation,
    consecutiveFailures,
    escalationLevel,
  });

  await workflow.env.JOB_DB.batch(batch);

  return { logged: batch.length, consecutiveFailures, escalationLevel };
}

function buildHealthMetricBatch({
  healthStmt,
  detailStmt,
  healthEvaluation,
  consecutiveFailures,
  escalationLevel,
}) {
  return [
    ...healthEvaluation.services.map((service) =>
      healthStmt.bind(service.url, service.status, service.latencyMs)
    ),
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
      'DB',
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

export async function getConsecutiveFailures(env) {
  try {
    const row = await env.JOB_DB.prepare(
      `
      SELECT COUNT(*) as cnt FROM health_check_details
      WHERE check_type = 'http'
      AND status != 'healthy'
      AND created_at > datetime('now', '-1 hour')
    `
    ).first();

    return row?.cnt || 0;
  } catch {
    return 0;
  }
}
