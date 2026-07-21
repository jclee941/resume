const fs = require('fs');
const path = require('path');

function loadModules() {
  const moduleDir = path.resolve(__dirname, '../../../../apps/portfolio/lib/entry-router-utils');
  const transformedSource = ['constants.js', 'response-headers.js']
    .map((fileName) => fs.readFileSync(path.join(moduleDir, fileName), 'utf8'))
    .join('\n')
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];\n?/gm, '')
    .replace(/^export\s*\{[\s\S]*?\};\n?/gm, '');

  const module = { exports: {} };
  const factory = new Function(
    'module',
    'exports',
    'Response',
    'Headers',
    'CompressionStream',
    `${transformedSource}
module.exports = { applyResponseHeaders, LAST_MODIFIED, BUILD_ETAG_VERSION };`
  );

  factory(module, module.exports, Response, Headers, CompressionStream);
  return module.exports;
}

describe('response-headers conditional requests', () => {
  const { applyResponseHeaders, LAST_MODIFIED, BUILD_ETAG_VERSION } = loadModules();

  const htmlResponse = () =>
    new Response('<html><body>portfolio</body></html>', {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });

  const conditionalContext = (overrides = {}) => ({
    conditionalRequests: true,
    method: 'GET',
    language: 'ko',
    source: 'default',
    ...overrides,
  });

  function currentEtag(pathname, context) {
    const wrapped = applyResponseHeaders(htmlResponse(), pathname, context);
    return wrapped.headers.get('ETag');
  }

  test('stamps deploy-versioned language-scoped etags on html responses', () => {
    const etag = currentEtag('/', conditionalContext());

    expect(etag).toMatch(/^W\/".*"$/);
    expect(etag).toContain('-ko-');
    expect(etag).toContain(BUILD_ETAG_VERSION);
    expect(etag).not.toContain('2026-02-15');
  });

  test('returns 304 without body when If-None-Match matches the response etag', () => {
    const etag = currentEtag('/', conditionalContext());
    const wrapped = applyResponseHeaders(
      htmlResponse(),
      '/',
      conditionalContext({ ifNoneMatch: etag, acceptEncoding: 'gzip' })
    );

    expect(wrapped.status).toBe(304);
    expect(wrapped.body).toBeNull();
    expect(wrapped.headers.get('ETag')).toBe(etag);
    expect(wrapped.headers.get('Cache-Control')).toBe('private, no-cache');
    expect(wrapped.headers.get('Last-Modified')).toBe(LAST_MODIFIED);
    expect(wrapped.headers.get('Content-Encoding')).toBeNull();
  });

  test('returns 304 for HEAD requests with a matching validator', () => {
    const etag = currentEtag('/en/', conditionalContext({ language: 'en' }));
    const wrapped = applyResponseHeaders(
      htmlResponse(),
      '/en/',
      conditionalContext({ language: 'en', method: 'HEAD', ifNoneMatch: etag })
    );

    expect(wrapped.status).toBe(304);
  });

  test('returns 304 when If-Modified-Since is not older than Last-Modified', () => {
    const wrapped = applyResponseHeaders(
      htmlResponse(),
      '/',
      conditionalContext({ ifModifiedSince: LAST_MODIFIED })
    );

    expect(wrapped.status).toBe(304);
    expect(wrapped.body).toBeNull();
  });

  test('serves 200 when validators are stale and ignores If-Modified-Since once If-None-Match exists', async () => {
    const staleEtag = applyResponseHeaders(
      htmlResponse(),
      '/',
      conditionalContext({ ifNoneMatch: 'W/"different-etag"' })
    );
    expect(staleEtag.status).toBe(200);
    expect(await staleEtag.text()).toContain('portfolio');

    const mismatchedEtagFreshDate = applyResponseHeaders(
      htmlResponse(),
      '/',
      conditionalContext({
        ifNoneMatch: 'W/"different-etag"',
        ifModifiedSince: LAST_MODIFIED,
      })
    );
    expect(mismatchedEtagFreshDate.status).toBe(200);

    const oldDate = applyResponseHeaders(
      htmlResponse(),
      '/',
      conditionalContext({ ifModifiedSince: 'Mon, 01 Jan 2001 00:00:00 GMT' })
    );
    expect(oldDate.status).toBe(200);
  });

  test('never returns 304 for unsafe methods, no-store paths, or without opt-in', () => {
    const etag = currentEtag('/', conditionalContext());

    const postRequest = applyResponseHeaders(
      htmlResponse(),
      '/',
      conditionalContext({ method: 'POST', ifNoneMatch: etag })
    );
    expect(postRequest.status).toBe(200);

    const apiEtag = currentEtag('/api/csp-violation', conditionalContext());
    const noStorePath = applyResponseHeaders(
      htmlResponse(),
      '/api/csp-violation',
      conditionalContext({ ifNoneMatch: apiEtag })
    );
    expect(noStorePath.status).toBe(200);

    const withoutOptIn = applyResponseHeaders(htmlResponse(), '/', {
      method: 'GET',
      language: 'ko',
      ifNoneMatch: etag,
    });
    expect(withoutOptIn.status).toBe(200);
  });
});
