// Regression tests for /job/: the page renders, fits its nonce/hash CSP (no inline
// on* or style attributes), and keeps API calls under the /job prefix.
const vm = require('vm');

describe('job dashboard view', () => {
  let jobWorker;
  let DASHBOARD_SCRIPT_CORE;

  beforeAll(async () => {
    jest.unstable_mockModule(
      'cloudflare:workers',
      () => ({ DurableObject: class {}, WorkflowEntrypoint: class {} }),
      { virtual: true }
    );
    ({ default: jobWorker } = await import('../../../apps/job-dashboard/src/index.js'));
    ({ DASHBOARD_SCRIPT_CORE } =
      await import('../../../apps/job-dashboard/src/views/scripts/core.js'));
  });

  function fetchDashboard(path = '/job/') {
    return jobWorker.fetch(new Request(`https://resume.jclee.me${path}`), {}, { waitUntil() {} });
  }

  function loadCore(pathname = '/job/') {
    const calls = [];
    const listeners = {};
    const context = vm.createContext({
      location: { pathname },
      document: {
        cookie: 'csrf_token=abc123',
        addEventListener: (type, fn) => {
          listeners[type] = fn;
        },
      },
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200 };
      },
      Headers,
      FormData: class {},
    });
    const exported = vm.runInContext(
      `${DASHBOARD_SCRIPT_CORE}\n;({ apiFetch, escapeHtml, actions: DASHBOARD_ACTIONS })`,
      context
    );
    return { ...exported, calls, listeners, context };
  }

  test('GET /job/ returns the rendered dashboard HTML', async () => {
    const response = await fetchDashboard();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('<title>Job Dashboard');
  });

  test('markup and generated rows avoid CSP-blocked inline attributes', async () => {
    const response = await fetchDashboard();
    const html = await response.text();
    const [, nonce] = response.headers.get('content-security-policy').match(/'nonce-([a-f0-9]+)'/);

    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(html).not.toMatch(/<[a-z][^<>]*\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/<[a-z][^<>]*\sstyle\s*=/i);
  });

  test('every data-action control is wired to the delegated dispatcher', async () => {
    const html = await (await fetchDashboard()).text();
    const { actions } = loadCore();
    const used = new Set([...html.matchAll(/data-action="([a-z-]+)"/g)].map(([, name]) => name));
    used.delete('update-status'); // dispatched by the change listener

    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((name) => !(name in actions))).toEqual([]);
  });

  test('apiFetch keeps API calls under the /job prefix and sends CSRF on writes', async () => {
    const underJob = loadCore('/job/');
    await underJob.apiFetch('/api/stats');
    await underJob.apiFetch('/api/auto-apply/start', { method: 'POST', body: { dryRun: true } });

    expect(underJob.calls.map(({ url }) => url)).toEqual([
      '/job/api/stats',
      '/job/api/auto-apply/start',
    ]);
    expect(underJob.calls[1].init.headers.get('X-CSRF-Token')).toBe('abc123');

    const standalone = loadCore('/');
    await standalone.apiFetch('/api/stats');
    expect(standalone.calls[0].url).toBe('/api/stats');
  });

  test('delegated clicks pass data attributes to dashboard actions', () => {
    const core = loadCore();
    const received = [];
    core.context.triggerAutoApply = (dryRun) => received.push(['auto-apply', dryRun]);
    core.context.goToPage = (page) => received.push(['go-page', page]);
    const click = (dataset) => core.listeners.click({ target: { closest: () => ({ dataset }) } });

    click({ action: 'auto-apply', dryRun: 'true' });
    click({ action: 'auto-apply', dryRun: 'false' });
    click({ action: 'go-page', page: '3' });
    click({ action: 'not-registered' });

    expect(received).toEqual([
      ['auto-apply', true],
      ['auto-apply', false],
      ['go-page', 3],
    ]);
  });

  test('escapeHtml neutralizes attribute-breaking characters', () => {
    const { escapeHtml } = loadCore();

    expect(escapeHtml('<a title="x">\'&')).toBe('&lt;a title=&quot;x&quot;&gt;&#39;&amp;');
    expect(escapeHtml(null)).toBe('');
  });
});
