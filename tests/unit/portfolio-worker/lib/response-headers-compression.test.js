const fs = require('fs');
const path = require('path');

function loadResponseHeaders() {
  const modulePath = path.resolve(
    __dirname,
    '../../../../apps/portfolio/lib/entry-router-utils/response-headers.js'
  );
  const source = fs
    .readFileSync(modulePath, 'utf8')
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];\n?/gm, '')
    .replace(/^export\s*\{[\s\S]*?\};\n?/gm, '');

  const module = { exports: {} };
  const factory = new Function(
    'module',
    'exports',
    'Response',
    'Headers',
    'CompressionStream',
    'DecompressionStream',
    `${source}
const LAST_MODIFIED = 'Mon, 01 Jan 2024 00:00:00 GMT';
module.exports = { applyResponseHeaders };`
  );

  factory(module, module.exports, Response, Headers, CompressionStream, DecompressionStream);
  return module.exports;
}

describe('response-headers compression', () => {
  const { applyResponseHeaders } = loadResponseHeaders();

  test('gzips final HTML responses when the browser accepts gzip', async () => {
    const response = new Response('<html><body>compressed</body></html>', {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });

    const wrapped = applyResponseHeaders(response, '/', {
      acceptEncoding: 'br, gzip',
    });

    expect(wrapped.headers.get('Content-Encoding')).toBe('gzip');
    expect(wrapped.headers.get('Vary')).toContain('Accept-Encoding');

    const decoded = await new Response(
      wrapped.body.pipeThrough(new DecompressionStream('gzip'))
    ).text();
    expect(decoded).toContain('compressed');
  });

  test('keeps HTML plain when the browser does not advertise gzip support', async () => {
    const response = new Response('<html><body>plain</body></html>', {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });

    const wrapped = applyResponseHeaders(response, '/', {
      acceptEncoding: 'br',
    });

    expect(wrapped.headers.get('Content-Encoding')).toBeNull();
    expect(await wrapped.text()).toContain('plain');
  });

  test('keeps HTML plain when gzip is explicitly refused with q=0', async () => {
    const response = new Response('<html><body>plain</body></html>', {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });

    const wrapped = applyResponseHeaders(response, '/', {
      acceptEncoding: 'gzip;q=0, br;q=1',
    });

    expect(wrapped.headers.get('Content-Encoding')).toBeNull();
    expect(await wrapped.text()).toContain('plain');
  });
});
