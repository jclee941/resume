import { ApplicationManager } from '../../auto-apply/application-manager.js';
import { getSlackService } from '../../shared/services/slack/index.js';

const _appManager = new ApplicationManager();

export default async function slackRoutes(fastify) {
  const slack = getSlackService();

  fastify.post('/test', async (request, reply) => {
    try {
      const result = await slack.sendTest('테스트 메시지');
      return { success: result.ok, result };
    } catch (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/notify', async (request, reply) => {
    const { type, data } = request.body || {};
    try {
      let result;

      switch (type) {
        case 'high_match_job':
          result = await slack.notifyHighMatchJob(data.job, data.matchScore, data.channel);
          break;
        case 'status_change':
          result = await slack.notifyStatusChange(
            data.application,
            data.oldStatus,
            data.newStatus,
            data.note,
            data.channel
          );
          break;
        case 'daily_report':
          result = await slack.notifyDailyReport(data.stats, data.date, data.channel);
          break;
        case 'search_results':
          result = await slack.notifySearchResults(data.jobs, data.query, data.channel);
          break;
        case 'auto_apply_result':
          result = await slack.notifyAutoApplyResult(data.results, data.dryRun, data.channel);
          break;
        default:
          result = await slack.send(
            {
              text: data.text || 'No message',
              ...data,
            },
            data.channel
          );
      }
      return { success: result?.ok, result };
    } catch (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
