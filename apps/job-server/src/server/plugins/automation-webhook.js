import fp from 'fastify-plugin';
import { signWebhookPayload } from '../../shared/services/webhook/webhook-signer.js';

/**
 * @typedef {object} WebhookResult
 * @property {boolean} sent
 * @property {string} event
 * @property {string} [reason]
 * @property {number} [status]
 * @property {string} [error]
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function automationWebhookPlugin(fastify) {
  const webhookUrl = process.env.AUTOMATION_WEBHOOK_URL || process.env.WEBHOOK_URL;
  const webhookSecret = process.env.AUTOMATION_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

  if (!webhookUrl) {
    fastify.decorate(
      'triggerAutomationWebhook',
      /**
       * @param {string} event
       * @param {unknown} [_data]
       * @returns {Promise<WebhookResult>}
       */
      async (event, _data) => {
        fastify.log.debug(
          { event },
          'automation webhook skipped (AUTOMATION_WEBHOOK_URL not configured)'
        );
        return { sent: false, event, reason: 'not-configured' };
      }
    );
    fastify.log.info('automation webhook plugin loaded (disabled)');
    return;
  }

  fastify.decorate(
    'triggerAutomationWebhook',
    /**
     * @param {string} event
     * @param {unknown} [data]
     * @returns {Promise<WebhookResult>}
     */
    async (event, data) => {
      try {
        const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
        /** @type {Record<string, string>} */
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
          fastify.log.error(
            { event, status: response.status },
            'automation webhook request failed'
          );
          return { sent: false, event, status: response.status };
        }

        fastify.log.info({ event }, 'automation webhook triggered successfully');
        return { sent: true, event };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error({ event, error: errorMessage }, 'automation webhook error');
        return { sent: false, event, error: errorMessage };
      }
    }
  );

  fastify.log.info({ url: webhookUrl }, 'automation webhook plugin loaded');
}

export default fp(automationWebhookPlugin, { name: 'automation-webhook' });
