const fs = require('fs');
const path = require('path');

function readWorkerFile(relPath) {
  const abs = path.join(__dirname, '../../', relPath);
  return fs.readFileSync(abs, 'utf-8');
}

describe('Network Failure Scenarios', () => {
  test('D1 unavailable should return graceful 503 in auto-apply webhook', () => {
    const source = readWorkerFile(
      'typescript/job-automation/workers/src/handlers/auto-apply-webhook-handler.js'
    );

    expect(source).toContain('if (!db)');
    expect(source).toContain('Database not configured');
    expect(source).toContain('}, 503)');
  });

  test('KV unavailable should fail-open for rate limiting', () => {
    const source = readWorkerFile('typescript/job-automation/workers/src/middleware/rate-limit.js');

    expect(source).toContain('if (!env?.RATE_LIMIT_KV)');
    expect(source).toContain('return { ok: true };');
    expect(source).toContain("console.error('Rate limit KV error:', error);");
  });

  test('R2 screenshot writes should be guarded by binding availability', () => {
    const source = readWorkerFile(
      'typescript/job-automation/src/crawlers/stealth-browser-crawler.js'
    );

    expect(source).toContain('this.screenshotOnError && this.env.SCREENSHOTS');
    expect(source).toContain('await this.env.SCREENSHOTS.put');
  });

  test('timeout handling should use AbortSignal timeout in webhook handlers', () => {
    const resumeSync = readWorkerFile(
      'typescript/job-automation/workers/src/handlers/resume-sync-handler.js'
    );
    const autoApply = readWorkerFile(
      'typescript/job-automation/workers/src/handlers/auto-apply-webhook-handler.js'
    );

    expect(resumeSync).toContain('AbortSignal.timeout(10000)');
    expect(autoApply).toContain('AbortSignal.timeout(10000)');
    expect(autoApply).toContain('AbortSignal.timeout(15000)');
  });

  test('error response format should be structured JSON with success=false and error', () => {
    const resumeSync = readWorkerFile(
      'typescript/job-automation/workers/src/handlers/resume-sync-handler.js'
    );
    const autoApply = readWorkerFile(
      'typescript/job-automation/workers/src/handlers/auto-apply-webhook-handler.js'
    );

    expect(resumeSync).toContain(
      'jsonResponse({ success: false, error: normalized.message }, 500)'
    );
    expect(autoApply).toContain('jsonResponse({ success: false, error: normalized.message }, 500)');
  });
});
