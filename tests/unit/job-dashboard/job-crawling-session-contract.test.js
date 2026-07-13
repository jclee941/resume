const assert = require('node:assert/strict');
const path = require('node:path');
const nodeTest = require('node:test');

const test = globalThis.test || nodeTest.test;
const beforeEach = globalThis.beforeEach || nodeTest.beforeEach;
const afterAll = globalThis.afterAll || nodeTest.after;
const originalFetch = globalThis.fetch;
const encryptionKey = btoa('0123456789abcdef0123456789abcdef');
const cookieFixture = 'fixture_cookie=plain';
const moduleRoot = '../../../apps/job-dashboard/src/workflows/job-crawling';
const crawlersPromise = import(path.join(__dirname, moduleRoot, 'platform-crawlers.js'));
const cryptoPromise = import(path.join(__dirname, '../../../packages/shared/src/crypto/index.js'));
let fetchCalls;

beforeEach(() => {
  fetchCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), options });
    if (String(url).includes('linkedin.com')) {
      return {
        ok: true,
        async text() {
          return '';
        },
      };
    }
    return {
      ok: true,
      async json() {
        return { data: [] };
      },
    };
  };
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

async function encryptedEnv(plaintext) {
  const { encrypt } = await cryptoPromise;
  const encrypted = await encrypt(plaintext, { ENCRYPTION_KEY: encryptionKey });
  return {
    ENCRYPTION_KEY: encryptionKey,
    SESSIONS: {
      async get() {
        return encrypted;
      },
    },
  };
}

test('decrypts encrypted raw cookies and applies normalized Wanted query parameters', async () => {
  const { crawlWanted } = await crawlersPromise;
  const env = await encryptedEnv(cookieFixture);

  const result = await crawlWanted(env, {
    keywords: ['  platform engineering  ', 'security'],
    location: 'Seoul',
    limit: 25,
    offset: 5,
  });

  assert.deepEqual(result, { jobs: [] });
  assert.equal(fetchCalls.length, 1);
  const request = fetchCalls[0];
  assert.equal(request.options.headers.Cookie === cookieFixture, true);
  const url = new URL(request.url);
  assert.equal(url.pathname, '/api/v4/jobs');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    country: 'kr',
    query: 'platform engineering',
    limit: '25',
    offset: '5',
    years: '-1',
    locations: 'Seoul',
    job_sort: 'job.latest_order',
  });
  assert.equal(url.searchParams.has('location'), false);
});

test('decrypts an encrypted cookie wrapper with snake-case expiry', async () => {
  const { crawlWanted } = await crawlersPromise;
  const env = await encryptedEnv(
    JSON.stringify({
      cookies: cookieFixture,
      expires_at: '2999-01-01T00:00:00.000Z',
    })
  );

  const result = await crawlWanted(env, { keyword: 'security' });

  assert.deepEqual(result, { jobs: [] });
  assert.equal(fetchCalls[0].options.headers.Cookie === cookieFixture, true);
});

test('rejects corrupt and expired Wanted sessions before outbound requests', async () => {
  const { crawlWanted } = await crawlersPromise;
  const corruptEnv = {
    ENCRYPTION_KEY: encryptionKey,
    SESSIONS: {
      async get() {
        return 'corrupt-fixture';
      },
    },
  };
  const expiredEnv = await encryptedEnv(
    JSON.stringify({
      cookies: cookieFixture,
      expiresAt: '2000-01-01T00:00:00.000Z',
    })
  );

  for (const env of [corruptEnv, expiredEnv]) {
    const result = await crawlWanted(env, { keyword: 'security' });
    assert.deepEqual(result.jobs, []);
    assert.match(result.error, /authentication required.*invalid wanted session/i);
  }
  assert.equal(fetchCalls.length, 0);
});

test('normalizes string and array criteria consistently for public crawlers', async () => {
  const { crawlLinkedIn, crawlRemember } = await crawlersPromise;

  await crawlRemember({ keyword: ['  cloud security  ', 'platform'] });
  await crawlLinkedIn({ keywords: '  cloud security  ', location: 'Seoul' });

  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[0].options.body, 'page=1&per=20&search=cloud%20security');
  const linkedInUrl = new URL(fetchCalls[1].url);
  assert.equal(linkedInUrl.searchParams.get('keywords'), 'cloud security');
  assert.equal(linkedInUrl.searchParams.get('location'), 'Seoul');
});
