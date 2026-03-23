import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CloudflareAnalyticsService } from '../cloudflare-analytics.js';

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('CloudflareAnalyticsService', { concurrency: 1 }, () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('isConfigured returns true only with both accountId and apiKey', () => {
    const configured = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });
    const missingKey = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: '' });
    const missingAccount = new CloudflareAnalyticsService({ accountId: '', apiKey: 'key' });

    assert.strictEqual(configured.isConfigured(), true);
    assert.strictEqual(missingKey.isConfigured(), false);
    assert.strictEqual(missingAccount.isConfigured(), false);
  });

  it('getWorkerAnalytics returns unavailable when not configured', async () => {
    const service = new CloudflareAnalyticsService({ accountId: '', apiKey: '' });

    const result = await service.getWorkerAnalytics(3);

    assert.deepEqual(result, {
      available: false,
      reason: 'Cloudflare API key not configured',
    });
  });

  it('getWorkerAnalytics handles non-ok responses', async () => {
    const service = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });
    mock.method(globalThis, 'fetch', async () => new Response('forbidden', { status: 403 }));

    const result = await service.getWorkerAnalytics(1);

    assert.strictEqual(result.available, false);
    assert.match(result.reason, /Cloudflare API error: 403/);
    assert.match(result.reason, /forbidden/);
  });

  it('getWorkerAnalytics handles GraphQL errors', async () => {
    const service = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });
    mock.method(globalThis, 'fetch', async () =>
      jsonResponse({
        errors: [{ message: 'bad query' }],
      })
    );

    const result = await service.getWorkerAnalytics();

    assert.deepEqual(result, {
      available: false,
      reason: 'GraphQL query error',
    });
  });

  it('getWorkerAnalytics handles fetch/network failures', async () => {
    const service = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('network down');
    });

    const result = await service.getWorkerAnalytics(2);

    assert.strictEqual(result.available, false);
    assert.strictEqual(result.reason, 'network down');
  });

  it('getWorkerAnalytics returns formatted analytics on success', async () => {
    const service = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });
    mock.method(globalThis, 'fetch', async () =>
      jsonResponse({
        data: {
          viewer: {
            accounts: [
              {
                httpRequestsAdaptiveGroups: [
                  {
                    dimensions: { date: '2026-03-20' },
                    sum: { requests: 100, bytes: 1000, cachedRequests: 20, cachedBytes: 200 },
                  },
                  {
                    dimensions: { date: '2026-03-21' },
                    sum: { requests: 50, bytes: 500, cachedRequests: 10, cachedBytes: 100 },
                  },
                ],
                httpRequestsAdaptive: [
                  { edgeResponseStatus: 200, clientRequestPath: '/a' },
                  { edgeResponseStatus: 201, clientRequestPath: '/a' },
                  { edgeResponseStatus: 404, clientRequestPath: '/b' },
                  { edgeResponseStatus: 500, clientRequestPath: null },
                ],
              },
            ],
          },
        },
      })
    );

    const result = await service.getWorkerAnalytics(7);

    assert.strictEqual(result.available, true);
    assert.strictEqual(result.totalRequests, 150);
    assert.strictEqual(result.totalBytes, 1500);
    assert.strictEqual(result.cachedRequests, 30);
    assert.strictEqual(result.cacheRate, 20);
    assert.strictEqual(result.successRate, 50);
    assert.deepEqual(result.statusCodes, { 200: 1, 201: 1, 404: 1, 500: 1 });
    assert.strictEqual(result.topPaths[0].path, '/a');
    assert.strictEqual(result.topPaths[0].count, 2);
    assert.strictEqual(result.dailyBreakdown.length, 2);
  });

  it('formatAnalytics returns zeroed structure when accounts are missing', () => {
    const service = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });

    const result = service.formatAnalytics({}, '2026-03-01', '2026-03-07');

    assert.strictEqual(result.available, true);
    assert.strictEqual(result.totalRequests, 0);
    assert.strictEqual(result.totalBytes, 0);
    assert.strictEqual(result.cachedRequests, 0);
    assert.strictEqual(result.successRate, 0);
    assert.deepEqual(result.statusCodes, {});
    assert.deepEqual(result.topPaths, []);
    assert.deepEqual(result.dailyBreakdown, []);
  });

  it('formatAnalytics handles empty/missing sums and requests', () => {
    const service = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });

    const result = service.formatAnalytics(
      {
        data: {
          viewer: {
            accounts: [
              {
                httpRequestsAdaptiveGroups: [{ dimensions: {} }],
                httpRequestsAdaptive: [],
              },
            ],
          },
        },
      },
      '2026-03-01',
      '2026-03-07'
    );

    assert.strictEqual(result.totalRequests, 0);
    assert.strictEqual(result.totalBytes, 0);
    assert.strictEqual(result.cachedRequests, 0);
    assert.strictEqual(result.cacheRate, 0);
    assert.strictEqual(result.successRate, 0);
    assert.strictEqual(result.dailyBreakdown[0].requests, 0);
    assert.strictEqual(result.dailyBreakdown[0].bytes, 0);
    assert.strictEqual(result.dailyBreakdown[0].cachedRequests, 0);
    assert.deepEqual(result.topPaths, []);
  });

  it('formatAnalytics defaults missing group/request arrays to empty lists', () => {
    const service = new CloudflareAnalyticsService({ accountId: 'acc', apiKey: 'key' });

    const result = service.formatAnalytics(
      {
        data: {
          viewer: {
            accounts: [{}],
          },
        },
      },
      '2026-03-01',
      '2026-03-07'
    );

    assert.strictEqual(result.available, true);
    assert.strictEqual(result.totalRequests, 0);
    assert.strictEqual(result.successRate, 0);
    assert.deepEqual(result.statusCodes, {});
    assert.deepEqual(result.topPaths, []);
  });
});
