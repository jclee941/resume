import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { UnifiedApplySystem } from '../../shared/services/apply/index.js';
import { UnifiedJobCrawler } from '../../crawlers/index.js';
import { AutoApplier } from '../../auto-apply/auto-applier.js';
import { ApplicationManager } from '../../auto-apply/application-manager.js';

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
      Object.assign(autoApplyState, JSON.parse(readFileSync(statusPath, 'utf-8')));
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
        const dryRun = options.dryRun !== false;
        const maxApps = options.maxApplications || 10;
        const enabledPlatforms = options.platforms || ['wanted', 'jobkorea', 'saramin'];
        const keywords = options.keywords || ['시니어 엔지니어', '클라우드 엔지니어', 'SRE'];

        const crawler = new UnifiedJobCrawler({
          sources: enabledPlatforms,
        });

        const appManager = new ApplicationManager();

        const system = new UnifiedApplySystem({
          crawler,
          applier: new AutoApplier({
            dryRun,
            maxDailyApplications: maxApps,
            autoApply: !dryRun,
          }),
          appManager,
          config: {
            dryRun,
            maxDailyApplications: maxApps,
            reviewThreshold: 60,
            autoApplyThreshold: 75,
            enabledPlatforms,
            keywords,
          },
        });

        const result = await system.run({
          keywords,
          dryRun,
          maxApplications: maxApps,
        });

        saveState({
          status: result.success ? 'completed' : 'failed',
          lastResult: result,
          currentJob: null,
          progress: {
            current: result.phases?.apply?.succeeded || 0,
            total: result.phases?.search?.found || 0,
          },
        });

        fastify.triggerN8nWebhook?.('auto-apply-complete', result).catch((e) => {
          console.error('Failed to trigger auto-apply-complete webhook:', e);
        });
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
