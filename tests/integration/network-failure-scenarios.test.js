const fs = require('fs');
const path = require('path');

function readWorkerFile(relPath) {
  const abs = path.join(__dirname, '../../', relPath);
  return fs.readFileSync(abs, 'utf-8');
}

describe('Network Failure Scenarios', () => {
  test('KV unavailable should fail-open for rate limiting', () => {
    const source = readWorkerFile('packages/shared/src/rate-limit/kv-sliding-window.js');

    expect(source).toContain('if (!kv) return { ok: true };');
    expect(source).toContain('return { ok: true };');
    expect(source).toContain("console.error('Rate limit KV error:', error);");
  });

  test('timeout handling should use AbortSignal timeout in webhook handlers', () => {
    const resumeSync = readWorkerFile('apps/job-dashboard/src/handlers/resume-sync-handler.js');

    expect(resumeSync).toContain('AbortSignal.timeout(10000)');
  });

  test('error response format should be structured JSON with success=false and error', () => {
    const resumeSync = readWorkerFile('apps/job-dashboard/src/handlers/resume-sync-handler.js');

    expect(resumeSync).toContain(
      'jsonResponse({ success: false, error: normalized.message }, 500)'
    );
  });
});
