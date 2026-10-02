import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { writePlatformSession } from '../../../services/platform-session.js';
import { searchWanted } from '../platforms.js';
import { formatWantedExperience } from '../wanted-detail.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const realFetch = globalThis.fetch;

/** @type {URL[]} */
let requests;
/** @type {Map<string, () => Response>} */
let responders;
/** @type {string[]} */
let detailRequests;
/** @type {Map<string, () => Response | Promise<Response>>} */
let detailResponders;

async function ctxWithWantedSession() {
  /** @type {Map<string, string>} */
  const kv = new Map();
  const env = {
    ENCRYPTION_KEY,
    SESSIONS: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => void kv.set(key, value),
    },
  };
  await writePlatformSession(env, 'wanted', 'wanted-cookie=1', 60);
  return { env };
}

function jsonResponse(ids) {
  return () =>
    Response.json({
      data: ids.map((id) => ({ id, company: { name: `Co ${id}` }, position: `Role ${id}` })),
    });
}

beforeEach(() => {
  requests = [];
  responders = new Map();
  detailRequests = [];
  detailResponders = new Map();
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const detailId = url.pathname.match(/^\/api\/v4\/jobs\/(\d+)$/)?.[1];
    if (detailId) {
      detailRequests.push(detailId);
      return (detailResponders.get(detailId) ?? (() => Response.json({ job: {} })))();
    }
    requests.push(url);
    const respond = responders.get(url.searchParams.get('query') ?? '');
    if (!respond) throw new Error(`unexpected query ${url.search}`);
    return respond();
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('searches each keyword and merges results by job id in first-seen order', async () => {
  responders.set('security', jsonResponse([1, 2]));
  responders.set('devsecops', jsonResponse([2, 3]));
  const ctx = await ctxWithWantedSession();

  const jobs = await searchWanted(ctx, {
    keywords: ['security', 'devsecops'],
    keyword: 'security',
    location: 'seoul',
  });

  assert.deepEqual(
    requests.map((url) => [url.searchParams.get('query'), url.searchParams.get('locations')]),
    [
      ['security', 'seoul'],
      ['devsecops', 'seoul'],
    ]
  );
  assert.deepEqual(
    jobs.map((job) => job.id),
    ['wanted-1', 'wanted-2', 'wanted-3']
  );
});

test('trims, de-duplicates and caps keywords at twelve queries', async () => {
  const letters = 'abcdefghijklm'.split('');
  for (const keyword of letters) responders.set(keyword, jsonResponse([]));
  const ctx = await ctxWithWantedSession();

  await searchWanted(ctx, { keywords: [' a ', 'a', '', ...letters.slice(1)] });

  assert.deepEqual(
    requests.map((url) => url.searchParams.get('query')),
    letters.slice(0, 12)
  );
});

test('keeps the single keyword request when keywords is absent or empty', async () => {
  responders.set('security', jsonResponse([7]));
  const ctx = await ctxWithWantedSession();

  const single = await searchWanted(ctx, { keyword: 'security' });
  const empty = await searchWanted(ctx, { keywords: [], keyword: 'security' });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].searchParams.get('locations'), 'all');
  assert.deepEqual(
    single.map((job) => job.id),
    ['wanted-7']
  );
  assert.deepEqual(empty, single);
});

test('one failing keyword keeps the results of the others', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  responders.set('security', () => new Response('nope', { status: 500 }));
  responders.set('devsecops', jsonResponse([4]));
  const ctx = await ctxWithWantedSession();

  const jobs = await searchWanted(ctx, { keywords: ['security', 'devsecops'] });

  assert.deepEqual(
    jobs.map((job) => job.id),
    ['wanted-4']
  );
  assert.equal(warn.mock.callCount(), 1);
});

test('throws the first error when every keyword fails', async (t) => {
  t.mock.method(console, 'warn', () => {});
  responders.set('security', () => new Response('nope', { status: 500 }));
  responders.set('devsecops', () => new Response('nope', { status: 429 }));
  const ctx = await ctxWithWantedSession();

  await assert.rejects(
    searchWanted(ctx, { keywords: ['security', 'devsecops'] }),
    /Wanted API error: 500/
  );
  assert.equal(requests.length, 2);
});

test('sends the country Wanted requires, else the API answers 422', async () => {
  responders.set('security', jsonResponse([1]));
  const ctx = await ctxWithWantedSession();

  await searchWanted(ctx, { keywords: ['security'] });

  const [url] = requests;
  assert.equal(url.pathname, '/api/v4/jobs');
  assert.equal(url.searchParams.get('country'), 'kr');
  assert.equal(url.searchParams.get('job_sort'), 'job.latest_order');
  assert.equal(url.searchParams.get('limit'), '100');
});

test('throws when no Wanted session is stored and none can be minted', async () => {
  await assert.rejects(
    searchWanted(
      { env: { ENCRYPTION_KEY, SESSIONS: { get: async () => null } } },
      { keyword: 'x' }
    ),
    /Wanted session refresh failed: WANTED_EMAIL is required/
  );
});

test('enriches merged jobs with description and experience from the detail endpoint', async () => {
  responders.set('security', jsonResponse([10, 11]));
  detailResponders.set('10', () =>
    Response.json({
      job: {
        annual_from: 3,
        annual_to: 8,
        detail: {
          intro: 'company boilerplate',
          main_tasks: 'SIEM 운영',
          requirements: 'Linux 경험',
          preferred_points: 'Terraform',
        },
      },
    })
  );
  detailResponders.set('11', () =>
    Response.json({ job: { annual_from: 5, annual_to: 100, detail: { main_tasks: 'cloud 보안' } } })
  );
  const ctx = await ctxWithWantedSession();

  const jobs = await searchWanted(ctx, { keywords: ['security'] });

  assert.deepEqual(detailRequests.sort(), ['10', '11']);
  assert.equal(jobs[0].description, 'SIEM 운영\nLinux 경험\nTerraform');
  assert.equal(jobs[0].experience, '3-8년');
  assert.equal(jobs[1].description, 'cloud 보안');
  assert.equal(jobs[1].experience, '5년 이상');
  assert.equal(jobs[0].position, 'Role 10');
  assert.equal(jobs[0].url, 'https://www.wanted.co.kr/wd/10');
});

test('enriches the single-keyword path too', async () => {
  responders.set('security', jsonResponse([12]));
  detailResponders.set('12', () =>
    Response.json({ job: { annual_from: 0, annual_to: 2, detail: { requirements: 'Linux' } } })
  );
  const ctx = await ctxWithWantedSession();

  const [job] = await searchWanted(ctx, { keyword: 'security' });

  assert.equal(job.description, 'Linux');
  assert.equal(job.experience, '0-2년');
});

test('a failing detail request keeps the list job and warns', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  responders.set('security', jsonResponse([20, 21, 22]));
  detailResponders.set('20', () => new Response('nope', { status: 500 }));
  detailResponders.set('21', () => {
    throw new Error('network down');
  });
  detailResponders.set('22', () =>
    Response.json({ job: { annual_from: 1, annual_to: 3, detail: { requirements: 'devops' } } })
  );
  const ctx = await ctxWithWantedSession();

  const jobs = await searchWanted(ctx, { keywords: ['security'] });

  assert.deepEqual(
    jobs.map((job) => [job.id, job.description, job.company]),
    [
      ['wanted-20', '', 'Co 20'],
      ['wanted-21', '', 'Co 21'],
      ['wanted-22', 'devops', 'Co 22'],
    ]
  );
  assert.equal(warn.mock.callCount(), 2);
});

test('fetches details for the first 400 jobs only, four at a time', async () => {
  const ids = Array.from({ length: 405 }, (_, index) => index + 1);
  responders.set('security', jsonResponse(ids));
  let inFlight = 0;
  let maxInFlight = 0;
  for (const id of ids) {
    detailResponders.set(String(id), async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      inFlight -= 1;
      return Response.json({ job: { detail: { requirements: `req ${id}` } } });
    });
  }
  const ctx = await ctxWithWantedSession();

  const jobs = await searchWanted(ctx, { keywords: ['security'] });

  assert.equal(jobs.length, 405);
  assert.equal(detailRequests.length, 400);
  assert.deepEqual(
    [...detailRequests].sort((a, b) => Number(a) - Number(b)),
    ids.slice(0, 400).map(String)
  );
  assert.equal(maxInFlight, 4);
  assert.equal(jobs[399].description, 'req 400');
  assert.equal(jobs[400].description, '');
});

test('mints a Wanted session when KV has none', async () => {
  /** @type {Map<string, string>} */
  const kv = new Map();
  const env = {
    ENCRYPTION_KEY,
    WANTED_EMAIL: 'me@example.com',
    WANTED_PASSWORD: 'pw',
    WANTED_ONEID_CLIENT_ID: 'client',
    SESSIONS: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => void kv.set(key, value),
    },
  };
  /** @type {string[]} */
  const listCookies = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname === '/v1/auth/token') return Response.json({ token: 'minted' });
    if (url.pathname === '/api/v4/user') return Response.json({ data: { id: 7 } });
    if (url.pathname !== '/api/v4/jobs') return Response.json({ job: {} });
    listCookies.push(init.headers?.Cookie);
    return jsonResponse([1])();
  };

  const jobs = await searchWanted({ env }, { keywords: ['security'] });

  assert.deepEqual(
    jobs.map((job) => job.id),
    ['wanted-1']
  );
  assert.deepEqual(listCookies, ['WWW_ONEID_ACCESS_TOKEN=minted']);
  assert.equal(kv.has('auth:wanted'), true);
});

test('makes no detail request when the list is empty', async () => {
  responders.set('security', jsonResponse([]));
  const ctx = await ctxWithWantedSession();

  const jobs = await searchWanted(ctx, { keywords: ['security'] });

  assert.deepEqual(jobs, []);
  assert.equal(detailRequests.length, 0);
});

test('formats the annual range in shapes match-scoring parses', () => {
  assert.equal(formatWantedExperience({ annual_from: 3, annual_to: 8 }), '3-8년');
  assert.equal(formatWantedExperience({ annual_from: 3, annual_to: 3 }), '3년');
  assert.equal(formatWantedExperience({ annual_from: 5, annual_to: 100 }), '5년 이상');
  assert.equal(formatWantedExperience({ annual_from: 0 }), '0년 이상');
  assert.equal(formatWantedExperience({}), '');
});
