import fp from 'fastify-plugin';
import { signWebhookPayload } from '../../shared/services/webhook/webhook-signer.js';

async function automationWebhookPlugin(fastify) {
  const webhookUrl = process.env.AUTOMATION_WEBHOOK_URL || process.env.WEBHOOK_URL;
  const webhookSecret = process.env.AUTOMATION_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

  if (!webhookUrl) {
    fastify.decorate('triggerAutomationWebhook', async (event, _data) => {
      fastify.log.debug(
        { event },
        'automation webhook skipped (AUTOMATION_WEBHOOK_URL not configured)'
      );
      return { sent: false, event, reason: 'not-configured' };
    });
    fastify.log.info('automation webhook plugin loaded (disabled)');
    return;
  }

  fastify.decorate('triggerAutomationWebhook', async (event, data) => {
    try {
      const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
      };

      if (webhookSecret) {
        const { signature } = signWebhookPayload(payload, webhookSecret);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        fastify.log.error({ event, status: response.status }, 'automation webhook request failed');
        return { sent: false, event, status: response.status };
      }

      fastify.log.info({ event }, 'automation webhook triggered successfully');
      return { sent: true, event };
    } catch (error) {
      fastify.log.error({ event, error: error.message }, 'automation webhook error');
      return { sent: false, event, error: error.message };
    }
  });

  fastify.log.info({ url: webhookUrl }, 'automation webhook plugin loaded');
}

export default fp(automationWebhookPlugin, { name: 'automation-webhook' });
