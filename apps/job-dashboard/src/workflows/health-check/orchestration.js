import { evaluateHealth } from './evaluation.js';
import { checkBindings, checkServices } from './probes.js';
import { logHealthMetrics } from './metrics.js';
import { notifyHealthFailure } from './notifications.js';

const DEFAULT_SERVICES = ['https://resume.jclee.me/health', 'https://resume.jclee.me/job/health'];

export async function runHealthCheckWorkflow(workflow, event, step) {
  const { services = DEFAULT_SERVICES } = event.payload || {};
  const startedAt = new Date().toISOString();

  const results = await step.do(
    'check-services',
    {
      retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
      timeout: '30 seconds',
    },
    () => checkServices(services)
  );

  const bindingResults = await step.do(
    'check-bindings',
    {
      retries: { limit: 2, delay: '5 seconds' },
      timeout: '30 seconds',
    },
    () => checkBindings(workflow.env)
  );

  const healthEvaluation = await step.do(
    'evaluate-health',
    {
      retries: { limit: 2, delay: '5 seconds' },
      timeout: '30 seconds',
    },
    () => evaluateHealth(results, bindingResults)
  );

  if (healthEvaluation.overallHealth !== 'healthy') {
    await step.do(
      'notify',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      () => notifyHealthFailure(workflow, healthEvaluation, startedAt)
    );
  }

  await step.do(
    'log-metrics',
    {
      retries: { limit: 3, delay: '5 seconds' },
      timeout: '2 minutes',
    },
    () => logHealthMetrics(workflow, healthEvaluation)
  );

  return {
    success: true,
    health: healthEvaluation.overallHealth,
    services: healthEvaluation.services,
    bindings: healthEvaluation.bindings,
    completedAt: new Date().toISOString(),
  };
}
