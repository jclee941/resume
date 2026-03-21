import config from '../config/index.js';
import { matchJobsWithAI } from '../../shared/services/matching/index.js';
import { UnifiedApplySystem } from '../../shared/services/apply/index.js';
import { UnifiedJobCrawler } from '../../crawlers/index.js';
import { AutoApplier } from '../../auto-apply/auto-applier.js';
import { ApplicationManager } from '../../auto-apply/application-manager.js';

export default async function aiRoutes(fastify) {
  fastify.get('/status', async () => {
    return {
      available: !!config.ai.anthropicApiKey,
      model: config.ai.claudeModel,
      lastTest: new Date().toISOString(),
      capabilities: ['matching', 'analysis', 'prediction', 'advice'],
    };
  });

  fastify.post('/match', async (request, reply) => {
    const { jobDescription, jobTitle, company } = request.body || {};

    if (!jobDescription) {
      return reply.status(400).send({ error: 'Job description required' });
    }

    const testJob = {
      title: jobTitle || 'Test Position',
      description: jobDescription,
      company: company || 'Test Company',
      location: 'Seoul',
    };

    try {
      const result = await matchJobsWithAI(
        request.body.resumePath || config.paths.resume,
        [testJob],
        {
          useAI: true,
          maxResults: 1,
        }
      );

      const match = result.jobs[0];
      return {
        success: true,
        match: match
          ? {
              score: match.matchScore,
              percentage: match.matchPercentage,
              type: match.matchType,
              confidence: match.confidence,
              reasoning: match.aiAnalysis?.matchDetails?.reasoning,
              successProbability: match.aiAnalysis?.successPrediction?.success_probability,
            }
          : null,
        aiEnabled: !result.resumeAnalysis?.fallback,
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  fastify.post('/run-system', async (request, reply) => {
    const {
      dryRun = true,
      maxApplications = 3,
      keywords = ['DevSecOps'],
      platforms,
    } = request.body || {};

    try {
      const enabledPlatforms = platforms || ['wanted', 'jobkorea', 'saramin'];

      const crawler = new UnifiedJobCrawler({
        sources: enabledPlatforms,
      });

      const appManager = new ApplicationManager();

      const system = new UnifiedApplySystem({
        crawler,
        applier: new AutoApplier({
          dryRun,
          maxDailyApplications: maxApplications,
          autoApply: !dryRun,
        }),
        appManager,
        config: {
          dryRun,
          maxDailyApplications: maxApplications,
          reviewThreshold: 60,
          autoApplyThreshold: 75,
          enabledPlatforms,
          keywords,
          useAI: true,
        },
      });

      system.run().catch((err) => fastify.log.error(err));

      return reply.status(202).send({
        success: true,
        message: 'AI 기반 통합 시스템 시작됨',
        config: {
          dryRun,
          maxApplications,
          keywords,
          platforms,
          aiEnabled: true,
        },
      });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
