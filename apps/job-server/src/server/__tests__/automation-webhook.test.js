import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import automationWebhookPlugin from '../plugins/automation-webhook.js';

describe('automation webhook plugin', () => {
  const originalFetch = globalThis.fetch;
  const originalWebhookUrl = process.env.AUTOMATION_WEBHOOK_URL;
  const originalWebhookSecret = process.env.AUTOMATION_WEBHOOK_SECRET;

  let mockFastify;

  beforeEach(() => {
    delete process.env.AUTOMATION_WEBHOOK_URL;
    delete process.env.AUTOMATION_WEBHOOK_SECRET;

    mockFastify = {
      decorate: (name, fn) => {
        mockFastify[name] = fn;
      },
      log: {
        info: () => {},
        error: () => {},
        debug: () => {},
      },
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (typeof originalWebhookUrl === 'string') {
      process.env.AUTOMATION_WEBHOOK_URL = originalWebhookUrl;
    } else {
      delete process.env.AUTOMATION_WEBHOOK_URL;
    }

    if (typeof originalWebhookSecret === 'string') {
      process.env.AUTOMATION_WEBHOOK_SECRET = originalWebhookSecret;
    } else {
      delete process.env.AUTOMATION_WEBHOOK_SECRET;
    }
  });

  it('decorates triggerAutomationWebhook on fastify', async () => {
    await automationWebhookPlugin(mockFastify);
    assert.equal(typeof mockFastify.triggerAutomationWebhook, 'function');
  });

  it('returns not-configured when AUTOMATION_WEBHOOK_URL is not set', async () => {
    await automationWebhookPlugin(mockFastify);

    const result = await mockFastify.triggerAutomationWebhook('job.created', { id: 1 });
    assert.deepEqual(result, {
      sent: false,
      event: 'job.created',
      reason: 'not-configured',
    });
  });

  it('sends POST without signature header when secret is missing', async () => {
    process.env.AUTOMATION_WEBHOOK_URL = 'https://automation.example.com/webhook/test';

    let calledUrl;
    let calledOpts;
    globalThis.fetch = async (url, opts) => {
      calledUrl = url;
      calledOpts = opts;
      return { ok: true, status: 200 };
    };

    await automationWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerAutomationWebhook('job.updated', { id: 2 });

    assert.deepEqual(result, { sent: true, event: 'job.updated' });
    assert.equal(calledUrl, process.env.AUTOMATION_WEBHOOK_URL);
    assert.equal(calledOpts.method, 'POST');
    assert.equal(calledOpts.headers['Content-Type'], 'application/json');
    assert.equal(calledOpts.headers['X-Webhook-Event'], 'job.updated');
    assert.equal('X-Webhook-Signature' in calledOpts.headers, false);
  });

  it('sends POST with signature header when URL and secret are set', async () => {
    process.env.AUTOMATION_WEBHOOK_URL = 'https://automation.example.com/webhook/test';
    process.env.AUTOMATION_WEBHOOK_SECRET = 'test-secret';

    let calledOpts;
    globalThis.fetch = async (_url, opts) => {
      calledOpts = opts;
      return { ok: true, status: 200 };
    };

    await automationWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerAutomationWebhook('job.applied', { id: 3 });

    assert.deepEqual(result, { sent: true, event: 'job.applied' });
    assert.match(calledOpts.headers['X-Webhook-Signature'], /^t=\d+,v1=[a-f0-9]{64}$/);
  });

  it('sends payload with event, data, and timestamp shape', async () => {
    process.env.AUTOMATION_WEBHOOK_URL = 'https://automation.example.com/webhook/test';

    let calledOpts;
    globalThis.fetch = async (_url, opts) => {
      calledOpts = opts;
      return { ok: true, status: 200 };
    };

    await automationWebhookPlugin(mockFastify);
    await mockFastify.triggerAutomationWebhook('job.search.completed', { count: 10 });

    const body = JSON.parse(calledOpts.body);
    assert.equal(body.event, 'job.search.completed');
    assert.deepEqual(body.data, { count: 10 });
    assert.equal(typeof body.timestamp, 'string');
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  });

  it('returns sent false without throwing on network error', async () => {
    process.env.AUTOMATION_WEBHOOK_URL = 'https://automation.example.com/webhook/test';
    globalThis.fetch = async () => {
      throw new Error('network down');
    };

    await automationWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerAutomationWebhook('job.failed', { id: 4 });

    assert.equal(result.sent, false);
    assert.equal(result.event, 'job.failed');
    assert.equal(result.error, 'network down');
  });

  it('returns sent false with status on non-200 response', async () => {
    process.env.AUTOMATION_WEBHOOK_URL = 'https://automation.example.com/webhook/test';
    globalThis.fetch = async () => ({ ok: false, status: 503 });

    await automationWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerAutomationWebhook('job.retry', { id: 5 });

    assert.deepEqual(result, { sent: false, event: 'job.retry', status: 503 });
  });
});
