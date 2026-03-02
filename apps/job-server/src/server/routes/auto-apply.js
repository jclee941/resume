import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const statusPath = join(__dirname, '..', '..', '..', 'auto-apply-status.json');

const autoApplyState = {
  status: 'idle',
  lastRun: null,
  lastResult: null,
  nextScheduled: null,
  currentJob: null,
  progress: { current: 0, total: 0 },
};

function loadState() {
  if (existsSync(statusPath)) {
    try {
      Object.assign(
        autoApplyState,
        JSON.parse(readFileSync(statusPath, 'utf-8')),
      );
    } catch (err) {
      console.error('Failed to load auto-apply state:', err.message);
    }
  }
  return autoApplyState;
}

function saveState(updates) {
  Object.assign(autoApplyState, updates, {
    updatedAt: new Date().toISOString(),
  });
  try {
    writeFileSync(statusPath, JSON.stringify(autoApplyState, null, 2));
  } catch (err) {
    console.error('Failed to save auto-apply state:', err.message);
  }
}

export default async function autoApplyRoutes(fastify) {
  fastify.get('/status', async () => {
    loadState();
    return {
      ...autoApplyState,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    };
  });

  fastify.post('/run', async (request, reply) => {
    const options = request.body || {};

    saveState({
      status: 'running',
      lastRun: new Date().toISOString(),
      currentJob: null,
      progress: { current: 0, total: 0 },
    });

    (async () => {
      try {
        const { AutoApplier } =
          await import('../../auto-apply/auto-applier.js');
        const applier = new AutoApplier({
          ...options,
          dryRun: options.dryRun !== false,
        });
        const result = await applier.run(options);

        saveState({
          status: result.success ? 'completed' : 'failed',
          lastResult: result,
          currentJob: null,
          progress: {
            current: result.results?.applied || 0,
            total: result.results?.matched || 0,
          },
        });

        fastify
          .triggerN8nWebhook?.('auto-apply-complete', result)
          .catch(() => {});
      } catch (error) {
        saveState({
          status: 'failed',
          lastResult: { success: false, error: error.message },
          currentJob: null,
        });
      }
    })();

    return reply.status(202).send({
      success: true,
      message: 'Auto-apply started',
      status: 'running',
    });
  });
}
