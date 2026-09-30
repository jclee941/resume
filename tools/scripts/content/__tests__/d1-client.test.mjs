import assert from 'node:assert/strict';
import test from 'node:test';
import {
  D1Error,
  createD1Client,
  parseJsonc,
  readDatabaseId,
  resolveAccountId,
  resolveAuthHeaders,
} from '../d1-client.mjs';
import { CREDS, fakeD1, makeRoot } from './helpers.mjs';

test('auth prefers CONTENT_API_TOKEN, then CLOUDFLARE_API_TOKEN, then the key pair', () => {
  const all = {
    CONTENT_API_TOKEN: 'a',
    CLOUDFLARE_API_TOKEN: 'b',
    CLOUDFLARE_API_KEY: 'k',
    CLOUDFLARE_EMAIL: 'e',
  };
  assert.deepEqual(resolveAuthHeaders(all), { Authorization: 'Bearer a' });
  assert.deepEqual(resolveAuthHeaders({ ...all, CONTENT_API_TOKEN: '' }), {
    Authorization: 'Bearer b',
  });
  assert.deepEqual(resolveAuthHeaders({ CLOUDFLARE_API_KEY: 'k', CLOUDFLARE_EMAIL: 'e' }), {
    'X-Auth-Key': 'k',
    'X-Auth-Email': 'e',
  });
  assert.equal(resolveAuthHeaders({ CLOUDFLARE_API_KEY: 'k' }), null);
});

test('account id prefers CONTENT_ACCOUNT_ID over CLOUDFLARE_ACCOUNT_ID', () => {
  assert.equal(resolveAccountId({ CONTENT_ACCOUNT_ID: 'x', CLOUDFLARE_ACCOUNT_ID: 'y' }), 'x');
  assert.equal(resolveAccountId({ CLOUDFLARE_ACCOUNT_ID: 'y' }), 'y');
  assert.equal(resolveAccountId({}), null);
});

test('parseJsonc handles comments and trailing commas without touching strings', () => {
  const parsed = parseJsonc('{ /* c */ "a": "x // not a comment, ]", // tail\n "b": [1, 2,], }');
  assert.deepEqual(parsed, { a: 'x // not a comment, ]', b: [1, 2] });
});

test('the database id comes from the JOB_DB binding in wrangler.jsonc', () => {
  assert.equal(readDatabaseId(makeRoot()), 'db-test-id');
});

test('query posts sql and params to the D1 endpoint with the selected auth', async () => {
  const d1 = fakeD1();
  const client = createD1Client({ env: CREDS, root: makeRoot(), fetchImpl: d1.fetchImpl });
  await client.query('SELECT path, sha256 FROM content_files', ['p']);
  const [call] = d1.calls;
  assert.equal(
    call.url,
    'https://api.cloudflare.com/client/v4/accounts/acct123/d1/database/db-test-id/query'
  );
  assert.equal(call.headers.Authorization, 'Bearer test-token');
  assert.deepEqual([call.sql, call.params], ['SELECT path, sha256 FROM content_files', ['p']]);
});

test('Cloudflare errors surface code and message but never the request body', async () => {
  const secretParam = 'HEX-BODY-SENTINEL';
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({ success: false, errors: [{ code: 7003, message: 'no such table' }] }),
      { status: 400 }
    );
  const client = createD1Client({ env: CREDS, root: makeRoot(), fetchImpl });
  await assert.rejects(client.query('SELECT 1', [secretParam]), (error) => {
    assert.ok(error instanceof D1Error);
    assert.equal(error.code, 7003);
    assert.match(error.message, /HTTP 400.*7003.*no such table/);
    assert.ok(!error.message.includes(secretParam));
    return true;
  });
});

test('creating a client without credentials fails naming the env vars and the fixtures escape', () => {
  assert.throws(
    () => createD1Client({ env: {}, root: makeRoot() }),
    /CONTENT_API_TOKEN.*CLOUDFLARE_API_TOKEN.*CONTENT_ACCOUNT_ID.*CONTENT_SOURCE=fixtures/s
  );
  assert.throws(
    () => createD1Client({ env: { CONTENT_API_TOKEN: 't' }, root: makeRoot() }),
    /CONTENT_ACCOUNT_ID/
  );
});
