const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

async function importEsm(relPathFromRoot) {
  const abs = path.join(__dirname, '../../', relPathFromRoot);
  return import(pathToFileURL(abs).href);
}

describe('Network Failure Scenarios', () => {
  describe('Binding unavailability', () => {
    it('should return 503 when D1 is unavailable in auto-apply webhook', async () => {
      const { AutoApplyWebhookHandler } = await importEsm(
        'typescript/job-automation/workers/src/handlers/auto-apply-webhook-handler.js'
      );

      const handler = new AutoApplyWebhookHandler({}, { getCookies: async () => 'cookie=value' });
      const request = new Request('https://resume.jclee.me/job/api/automation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });

      const response = await handler.triggerAutoApply(request);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toEqual({ success: false, error: 'Database not configured' });
    });

    it('should allow request when RATE_LIMIT_KV is unavailable', async () => {
      const { checkRateLimit } = await importEsm(
        'typescript/job-automation/workers/src/middleware/rate-limit.js'
      );

      const request = new Request('https://resume.jclee.me/job/api/stats', {
        headers: { 'cf-connecting-ip': '127.0.0.1' },
      });

      const result = await checkRateLimit(request, '/api/stats', {});
      expect(result).toEqual({ ok: true });
    });

    it('should return null session when KV sessions binding is unavailable', async () => {
      const { AutoApplyHandler } = await importEsm(
        'typescript/job-automation/workers/src/handlers/auto-apply.js'
      );

      const handler = new AutoApplyHandler({ DB: null, SESSIONS: null });
      const session = await handler.getWantedSession();

      expect(session).toBeNull();
    });

    it('should guard screenshot writes behind SCREENSHOTS binding availability', () => {
      const crawlerPath = path.join(
        __dirname,
        '../../typescript/job-automation/src/crawlers/stealth-browser-crawler.js'
      );
      const source = fs.readFileSync(crawlerPath, 'utf-8');

      expect(source).toContain('this.screenshotOnError && this.env.SCREENSHOTS');
      expect(source).toContain('await this.env.SCREENSHOTS.put');
    });
  });

  describe('Timeout handling and error format', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      jest.restoreAllMocks();
    });

    it('should return structured 500 JSON when resume sync request times out', async () => {
      const { ResumeSyncHandler } = await importEsm(
        'typescript/job-automation/workers/src/handlers/resume-sync-handler.js'
      );

      global.fetch = jest.fn().mockRejectedValue(new Error('Request timed out'));

      const handler = new ResumeSyncHandler({}, { getCookies: async () => 'session=abc' });
      const request = new Request('https://resume.jclee.me/job/api/automation/resume', {
        method: 'POST',
      });

      const response = await handler.triggerResumeSync(request);
      const body = await response.json();

      expect(global.fetch).toHaveBeenCalled();
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(typeof body.error).toBe('string');
      expect(body.error).toContain('Request timed out');
    });

    it('should return structured 500 JSON when auto-apply upstream request times out', async () => {
      const { AutoApplyWebhookHandler } = await importEsm(
        'typescript/job-automation/workers/src/handlers/auto-apply-webhook-handler.js'
      );

      global.fetch = jest.fn().mockRejectedValue(new Error('The operation was aborted'));

      const fakeDb = {
        prepare: jest.fn(),
      };

      const handler = new AutoApplyWebhookHandler(
        { DB: fakeDb },
        { getCookies: async () => 'cookie=1' }
      );
      const request = new Request('https://resume.jclee.me/job/api/automation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });

      const response = await handler.triggerAutoApply(request);
      const body = await response.json();

      expect(global.fetch).toHaveBeenCalled();
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(typeof body.error).toBe('string');
      expect(body.error).toContain('aborted');
    });
  });
});
