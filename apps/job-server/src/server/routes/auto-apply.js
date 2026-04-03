import { AutoApplier } from '../../auto-apply/auto-applier.js';
import { AutoApplyScheduler } from '../../auto-apply/scheduler.js';

function buildAutoApplierFactory(fastify) {
  return (runOptions = {}) => {
    const dryRun = runOptions.dryRun !== false;
    return new AutoApplier({
      secretsClient: fastify.secretsClient,
      dryRun,
      autoApply: !dryRun,
      maxDailyApplications: runOptions.maxApplications ?? 10,
      minMatchScore: runOptions.minMatchScore,
      excludeCompanies: runOptions.excludeCompanies || [],
      preferredCompanies: runOptions.preferredCompanies || [],
      delayBetweenApps: runOptions.delayBetweenApps,
    });
  };
}

function getScheduler(fastify) {
  if (fastify.autoApplyScheduler) {
    return fastify.autoApplyScheduler;
  }

  const scheduler = new AutoApplyScheduler({
    logger: fastify.log,
    d1Client: fastify.d1Client,
    autoApplierFactory: buildAutoApplierFactory(fastify),
  });

  scheduler.on('scheduled', (payload) => {
    fastify.log.info({ payload }, 'Auto-apply schedule fired');
  });
  scheduler.on('started', (payload) => {
    fastify.log.info({ payload }, 'Auto-apply run started');
  });
  scheduler.on('completed', (payload) => {
    fastify.log.info({ payload }, 'Auto-apply run completed');
  });
  scheduler.on('failed', (payload) => {
    fastify.log.error({ payload }, 'Auto-apply run failed');
  });

  scheduler.start();
  fastify.decorate('autoApplyScheduler', scheduler);
  return scheduler;
}

export default async function autoApplyRoutes(fastify) {
  const scheduler = getScheduler(fastify);

  fastify.addHook('onClose', async () => {
    scheduler.stop();
  });

  fastify.get('/schedule', async () => {
    const status = scheduler.getStatus();
    return {
      success: true,
      schedule: status.schedule,
      nextRun: status.nextRun,
      started: status.started,
      running: status.running,
    };
  });

  fastify.post('/schedule', async (request, reply) => {
    try {
      const updates = request.body || {};
      const status = scheduler.updateConfig(updates);

      if (status.schedule.enabled && !status.started) {
        scheduler.start();
      }

      if (!status.schedule.enabled && status.started) {
        scheduler.stop();
      }

      return {
        success: true,
        message: 'Scheduler updated',
        schedule: status.schedule,
        nextRun: status.nextRun,
      };
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  fastify.post('/trigger', async (request, reply) => {
    if (scheduler.isRunning() && scheduler.config.preventOverlapping) {
      return reply.status(409).send({
        success: false,
        status: 'running',
        message: 'Auto-apply already running; overlapping run prevented',
      });
    }

    scheduler.trigger({ source: 'api', options: request.body || {} }).catch((error) => {
      fastify.log.error({ err: error }, 'Manual auto-apply trigger failed');
    });

    return reply.status(202).send({
      success: true,
      status: 'running',
      message: 'Auto-apply manually triggered',
    });
  });

  fastify.post('/run', async (request, reply) => {
    if (scheduler.isRunning() && scheduler.config.preventOverlapping) {
      return reply.status(409).send({
        success: false,
        status: 'running',
        message: 'Auto-apply already running; overlapping run prevented',
      });
    }

    scheduler.trigger({ source: 'api', options: request.body || {} }).catch((error) => {
      fastify.log.error({ err: error }, 'Auto-apply /run trigger failed');
    });

    return reply.status(202).send({
      success: true,
      message: 'Auto-apply started',
      status: 'running',
    });
  });

  fastify.get('/status', async () => {
    const status = scheduler.getStatus();
    return {
      status: status.running ? 'running' : status.lastResult?.success === false ? 'failed' : 'idle',
      started: status.started,
      schedule: status.schedule,
      running: status.running,
      isRunning: scheduler.isRunning(),
      nextRun: status.nextRun,
      lastRun: status.lastRun,
      lastResult: status.lastResult,
      lastError: status.lastError,
      stats: status.stats,
      history: status.history,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    };
  });
}
