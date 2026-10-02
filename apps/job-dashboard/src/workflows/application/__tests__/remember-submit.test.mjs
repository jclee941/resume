import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { writePlatformSession } from '../../../services/platform-session.js';
import { REMEMBER_BROWSER_FETCH_FAILED } from '../../../services/remember/remember-fetch.js';
import { searchRemember } from '../remember-search.js';
import { submitRememberApplication } from '../remember-submit.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const originalFetch = globalThis.fetch;

async function createEnv() {
  const kv = new Map();
  const env = {
    ENCRYPTION_KEY,
    SESSIONS: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => void kv.set(key, value),
    },
  };
  await writePlatformSession(env, 'remember', 'stored-token', 60);
  return env;
}

function stubRemember({ status = null, missing = [], postings = [] } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(String(url)).pathname;
    calls.push({
      path,
      method: init.method ?? 'GET',
      body: init.body,
      auth: init.headers?.Authorization,
    });
    if (path.endsWith('/application_status')) return Response.json({ data: status, meta: {} });
    if (path.endsWith('/required_application_info')) {
      return Response.json({ data: { missing_fields: missing }, meta: {} });
    }
    if (path === '/v2/user.json') {
      return Response.json({
        code: 'ok',
        data: { user: { email: 'me@example.com', national_number: '01012345678' } },
      });
    }
    if (path.endsWith('/apply')) return Response.json({ data: { id: 1 }, meta: {} });
    if (path === '/job_postings/search') return Response.json({ data: postings, meta: {} });
    throw new Error(`unexpected request ${path}`);
  };
  return calls;
}

describe('submitRememberApplication', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('applies with the open profile and the account contact', async () => {
    const calls = stubRemember();

    const result = await submitRememberApplication(await createEnv(), 'remember-42');

    assert.equal(result.success, true);
    const apply = calls.find((call) => call.path === '/job_postings/42/apply');
    assert.equal(apply?.method, 'POST');
    assert.equal(apply?.auth, 'Token token=stored-token');
    assert.deepEqual(JSON.parse(String(apply?.body)), {
      phone: '01012345678',
      email: 'me@example.com',
      source: 'profile',
    });
  });

  it('reports an existing application without applying again', async () => {
    const calls = stubRemember({ status: { id: 9, status: 'applied' } });

    const result = await submitRememberApplication(await createEnv(), 'remember-42');

    assert.equal(result.alreadyApplied, true);
    assert.equal(
      calls.some((call) => call.path.endsWith('/apply')),
      false
    );
  });

  it('does not apply when the posting asks for fields the profile lacks', async () => {
    const calls = stubRemember({ missing: ['birth_year'] });

    const result = await submitRememberApplication(await createEnv(), 'remember-42');

    assert.equal(result.success, false);
    assert.match(String(result.error), /birth_year/);
    assert.equal(
      calls.some((call) => call.path.endsWith('/apply')),
      false
    );
  });
});

describe('searchRemember', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('keeps only open in-platform postings the profile can answer, with their text', async () => {
    const base = { status: 'published', application_type: 'apply', organization: { name: 'Acme' } };
    const calls = stubRemember({
      postings: [
        {
          ...base,
          id: 1,
          title: 'SRE',
          job_description: '운영',
          qualifications: '쿠버네티스',
          min_experience: 3,
          max_experience: 7,
        },
        { ...base, id: 2, title: 'Link only', application_type: 'link' },
        { ...base, id: 3, title: 'Needs portfolio', application_requirements: { portfolio: true } },
      ],
    });

    const jobs = await searchRemember({}, { keywords: ['SRE'] });

    assert.deepEqual(JSON.parse(String(calls[0].body)).search, {
      keywords: ['SRE'],
      include_applied_job_posting: false,
    });
    assert.deepEqual(
      jobs.map((job) => [job.id, job.company, job.experience, job.description]),
      [['remember-1', 'Acme', '3-7년', '운영\n\n쿠버네티스']]
    );
  });

  it('reads a posting with no experience ceiling as open-ended', async () => {
    stubRemember({
      postings: [
        {
          status: 'published',
          application_type: 'apply',
          id: 4,
          title: 'DevOps',
          min_experience: 2,
          max_experience: null,
        },
      ],
    });

    const [job] = await searchRemember({}, { keywords: ['DevOps'] });

    assert.equal(job.experience, '2년 이상');
  });

  it('retries a query once when the browser fetch fails', async (t) => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error('Remember browser fetch: Failed to fetch'), {
          code: REMEMBER_BROWSER_FETCH_FAILED,
        });
      }
      return Response.json({
        data: [{ status: 'published', application_type: 'apply', id: 5, title: 'SRE' }],
        meta: {},
      });
    };
    t.mock.timers.enable({ apis: ['setTimeout'] });

    const pending = searchRemember({}, { keywords: ['SRE'] });
    await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(2_000);
    const jobs = await pending;

    assert.equal(attempts, 2);
    assert.deepEqual(
      jobs.map((job) => job.id),
      ['remember-5']
    );
  });
});
