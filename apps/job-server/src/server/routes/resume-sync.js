import { unifiedResumeSyncTool } from '../../tools/unified-resume-sync.js';

export default async function resumeSyncRoutes(fastify) {
  // POST /sync — trigger full resume sync to Wanted
  fastify.post('/sync', {
    config: { public: false },
    handler: async (request, reply) => {
      const { platforms = ['wanted'], resume_id, dry_run = false } = request.body || {};

      if (!resume_id) {
        return reply.status(400).send({ error: 'resume_id is required' });
      }

      const result = await unifiedResumeSyncTool.execute({
        action: 'sync',
        platforms,
        resume_id,
        dry_run,
      });

      return result;
    },
  });

  // GET /status — check sync status for all platforms
  fastify.get('/status', {
    handler: async () => {
      return unifiedResumeSyncTool.execute({ action: 'status' });
    },
  });

  // POST /preview — preview changes without applying
  fastify.post('/preview', {
    handler: async (request) => {
      const { platforms = ['wanted'], resume_id } = request.body || {};
      return unifiedResumeSyncTool.execute({
        action: 'preview',
        platforms,
        resume_id,
      });
    },
  });

  // POST /diff — compare local vs remote
  fastify.post('/diff', {
    handler: async (request, reply) => {
      const { platforms = ['wanted'], resume_id } = request.body || {};
      if (!resume_id) {
        return reply.status(400).send({ error: 'resume_id is required' });
      }
      return unifiedResumeSyncTool.execute({
        action: 'diff',
        platforms,
        resume_id,
      });
    },
  });
}
