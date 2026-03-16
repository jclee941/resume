import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import n8nWebhookPlugin from '../plugins/n8n-webhook.js';

describe('n8n webhook plugin', () => {
  const originalFetch = globalThis.fetch;
  const originalWebhookUrl = process.env.N8N_WEBHOOK_URL;
  const originalWebhookSecret = process.env.N8N_WEBHOOK_SECRET;

  let mockFastify;

  beforeEach(() => {
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_SECRET;

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
      process.env.N8N_WEBHOOK_URL = originalWebhookUrl;
    } else {
      delete process.env.N8N_WEBHOOK_URL;
    }

    if (typeof originalWebhookSecret === 'string') {
      process.env.N8N_WEBHOOK_SECRET = originalWebhookSecret;
    } else {
      delete process.env.N8N_WEBHOOK_SECRET;
    }
  });

  it('decorates triggerN8nWebhook on fastify', async () => {
    await n8nWebhookPlugin(mockFastify);
    assert.equal(typeof mockFastify.triggerN8nWebhook, 'function');
  });

  it('returns not-configured when N8N_WEBHOOK_URL is not set', async () => {
    await n8nWebhookPlugin(mockFastify);

    const result = await mockFastify.triggerN8nWebhook('job.created', { id: 1 });
    assert.deepEqual(result, {
      sent: false,
      event: 'job.created',
      reason: 'not-configured',
    });
  });

  it('sends POST without signature header when secret is missing', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';

    let calledUrl;
    let calledOpts;
    globalThis.fetch = async (url, opts) => {
      calledUrl = url;
      calledOpts = opts;
      return { ok: true, status: 200 };
    };

    await n8nWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerN8nWebhook('job.updated', { id: 2 });

    assert.deepEqual(result, { sent: true, event: 'job.updated' });
    assert.equal(calledUrl, process.env.N8N_WEBHOOK_URL);
    assert.equal(calledOpts.method, 'POST');
    assert.equal(calledOpts.headers['Content-Type'], 'application/json');
    assert.equal(calledOpts.headers['X-Webhook-Event'], 'job.updated');
    assert.equal('X-Webhook-Signature' in calledOpts.headers, false);
  });

  it('sends POST with signature header when URL and secret are set', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';
    process.env.N8N_WEBHOOK_SECRET = 'test-secret';

    let calledOpts;
    globalThis.fetch = async (_url, opts) => {
      calledOpts = opts;
      return { ok: true, status: 200 };
    };

    await n8nWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerN8nWebhook('job.applied', { id: 3 });

    assert.deepEqual(result, { sent: true, event: 'job.applied' });
    assert.match(calledOpts.headers['X-Webhook-Signature'], /^t=\d+,v1=[a-f0-9]{64}$/);
  });

  it('sends payload with event, data, and timestamp shape', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';

    let calledOpts;
    globalThis.fetch = async (_url, opts) => {
      calledOpts = opts;
      return { ok: true, status: 200 };
    };

    await n8nWebhookPlugin(mockFastify);
    await mockFastify.triggerN8nWebhook('job.search.completed', { count: 10 });

    const body = JSON.parse(calledOpts.body);
    assert.equal(body.event, 'job.search.completed');
    assert.deepEqual(body.data, { count: 10 });
    assert.equal(typeof body.timestamp, 'string');
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  });

  it('returns sent false without throwing on network error', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';
    globalThis.fetch = async () => {
      throw new Error('network down');
    };

    await n8nWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerN8nWebhook('job.failed', { id: 4 });

    assert.equal(result.sent, false);
    assert.equal(result.event, 'job.failed');
    assert.equal(result.error, 'network down');
  });

  it('returns sent false with status on non-200 response', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';
    globalThis.fetch = async () => ({ ok: false, status: 503 });

    await n8nWebhookPlugin(mockFastify);
    const result = await mockFastify.triggerN8nWebhook('job.retry', { id: 5 });

    assert.deepEqual(result, { sent: false, event: 'job.retry', status: 503 });
  });
});
