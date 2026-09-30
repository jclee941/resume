import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { writePlatformSession } from '../../../services/platform-session.js';
import { searchWanted } from '../platforms.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const realFetch = globalThis.fetch;

/** @type {URL[]} */
let requests;
/** @type {Map<string, () => Response>} */
let responders;

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
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
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

test('trims, de-duplicates and caps keywords at five queries', async () => {
  for (const keyword of ['a', 'b', 'c', 'd', 'e', 'f']) responders.set(keyword, jsonResponse([]));
  const ctx = await ctxWithWantedSession();

  await searchWanted(ctx, { keywords: [' a ', 'a', '', 'b', 'c', 'd', 'e', 'f'] });

  assert.deepEqual(
    requests.map((url) => url.searchParams.get('query')),
    ['a', 'b', 'c', 'd', 'e']
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
  assert.equal(url.searchParams.get('limit'), '20');
});

test('throws when no Wanted session is stored', async () => {
  await assert.rejects(
    searchWanted(
      { env: { ENCRYPTION_KEY, SESSIONS: { get: async () => null } } },
      { keyword: 'x' }
    ),
    /No Wanted session available/
  );
});
