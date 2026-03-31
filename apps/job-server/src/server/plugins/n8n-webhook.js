import fp from 'fastify-plugin';
import { signWebhookPayload } from '../../shared/services/webhook/webhook-signer.js';

async function n8nWebhookPlugin(fastify) {
  const webhookUrl = process.env.N8N_URL || process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    fastify.decorate('triggerN8nWebhook', async (event, _data) => {
      fastify.log.debug({ event }, 'n8n webhook skipped (N8N_WEBHOOK_URL not configured)');
      return { sent: false, event, reason: 'not-configured' };
    });
    fastify.log.info('n8n webhook plugin loaded (disabled — N8N_WEBHOOK_URL not set)');
    return;
  }

  fastify.decorate('triggerN8nWebhook', async (event, data) => {
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
        fastify.log.error({ event, status: response.status }, 'n8n webhook request failed');
        return { sent: false, event, status: response.status };
      }

      fastify.log.info({ event }, 'n8n webhook triggered successfully');
      return { sent: true, event };
    } catch (error) {
      fastify.log.error({ event, error: error.message }, 'n8n webhook error');
      return { sent: false, event, error: error.message };
    }
  });

  fastify.log.info({ url: webhookUrl }, 'n8n webhook plugin loaded');
}

export default fp(n8nWebhookPlugin, { name: 'n8n-webhook' });
