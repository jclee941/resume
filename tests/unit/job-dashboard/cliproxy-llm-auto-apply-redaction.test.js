const path = require('path');
const { pathToFileURL } = require('url');

async function loadRunner() {
  const scriptPath = path.resolve(
    __dirname,
    '../../../apps/job-dashboard/scripts/dev/cliproxy-llm-auto-apply.mjs'
  );
  return import(pathToFileURL(scriptPath).href);
}

function createErrorFetcher(text) {
  return jest.fn(async () => ({
    ok: false,
    status: 502,
    async text() {
      return text;
    },
  }));
}

async function runWithErrorText(text) {
  const { runCliproxyLlmAutoApply } = await loadRunner();
  return runCliproxyLlmAutoApply({
    env: {
      CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
      CLIPROXY_API_KEY: 'test-key',
    },
    fetcher: createErrorFetcher(text),
    keyword: 'security',
    maxApplications: 1,
  });
}

describe('Cliproxy LLM auto-apply error redaction', () => {
  test('redacts sensitive upstream error details', async () => {
    const result = await runWithErrorText(
      JSON.stringify({
        message:
          'authorization: Bearer live-token token=secret email=user@example.com upstream failed',
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('[redacted]');
    expect(result.error).not.toContain('live-token');
    expect(result.error).not.toContain('user@example.com');
    expect(result.networkWrites).toBe(0);
    expect(result.cliproxyRequests).toBe(1);
  });

  test('redacts cookie and spaced password upstream error details', async () => {
    const result = await runWithErrorText(
      'cookie: sid=abc; refresh=def password = open-sesame failed'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('cookie=[redacted]');
    expect(result.error).not.toContain('sid=abc');
    expect(result.error).not.toContain('refresh=def');
    expect(result.error).not.toContain('open-sesame');
    expect(result.networkWrites).toBe(0);
    expect(result.cliproxyRequests).toBe(1);
  });
});
