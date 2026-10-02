import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { handleApplicationHistorySync } from '../applications/history-sync-operation.js';
import { fetchJobKoreaHistoryAfterLogin } from '../applications/jobkorea-history-login.js';

const post = (body) =>
  new Request('https://mcp.internal/api/applications/sync', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const stubSync = (summary) => {
  const calls = [];
  return { calls, sync: async (_env, options) => (calls.push(options), summary) };
};

describe('handleApplicationHistorySync', () => {
  it('syncs every history platform when the body is empty', async () => {
    const { calls, sync } = stubSync({ ok: true, status: 'success', platforms: {} });
    const response = await handleApplicationHistorySync({}, post(), sync);
    assert.equal(response.status, 200);
    assert.deepEqual(calls[0].platforms, ['wanted', 'jobkorea', 'remember']);
  });

  it('accepts remember as a requested platform', async () => {
    const { calls, sync } = stubSync({ ok: true, status: 'success', platforms: {} });
    const response = await handleApplicationHistorySync(
      {},
      post({ platforms: ['remember'] }),
      sync
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls[0].platforms, ['remember']);
  });

  it('passes a requested subset through once', async () => {
    const { calls, sync } = stubSync({ ok: true, status: 'success', platforms: {} });
    await handleApplicationHistorySync({}, post({ platforms: ['wanted', 'wanted'] }), sync);
    assert.deepEqual(calls[0].platforms, ['wanted']);
  });

  it('rejects unknown platforms and malformed bodies with 400 before syncing', async () => {
    const { calls, sync } = stubSync({ ok: true, status: 'success', platforms: {} });
    for (const body of [{ platforms: ['saramin'] }, { platforms: [] }, { platforms: 'wanted' }]) {
      assert.equal((await handleApplicationHistorySync({}, post(body), sync)).status, 400);
    }
    const invalid = new Request('https://mcp.internal/x', { method: 'POST', body: '{nope' });
    assert.equal((await handleApplicationHistorySync({}, invalid, sync)).status, 400);
    assert.equal(calls.length, 0);
  });

  it('reads JobKorea through a login in the browser that reads it, and only JobKorea', async () => {
    const { calls, sync } = stubSync({ ok: true, status: 'success', platforms: {} });
    await handleApplicationHistorySync({}, post(), sync);
    assert.equal(calls[0].adapters.jobkorea, fetchJobKoreaHistoryAfterLogin);
    assert.deepEqual(Object.keys(calls[0].adapters), ['jobkorea']);
  });

  it('answers 200 for a partial run and 502 only when every platform failed', async () => {
    const partial = stubSync({ ok: false, status: 'partial', platforms: {} });
    assert.equal((await handleApplicationHistorySync({}, post(), partial.sync)).status, 200);
    const failed = stubSync({ ok: false, status: 'failed', platforms: {} });
    assert.equal((await handleApplicationHistorySync({}, post(), failed.sync)).status, 502);
  });
});
