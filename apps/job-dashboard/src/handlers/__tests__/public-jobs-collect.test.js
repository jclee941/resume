import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { handlePublicJobsCollect } from '../public-jobs/collect-operation.js';

const request = (body) =>
  new Request('https://mcp.internal/api/public-jobs/collect', { method: 'POST', body });

describe('POST /api/public-jobs/collect', () => {
  it('collects every source when the body is empty', async () => {
    const calls = [];
    const collect = async (_env, options) => {
      calls.push(options);
      return { status: 'success', collectedAt: 'now', sources: {} };
    };
    const response = await handlePublicJobsCollect({ JOB_DB: {} }, request(''), collect);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ sources: ['alio', 'cleaneye', 'gojobs'] }]);
  });

  it('collects only the requested sources, once each', async () => {
    const calls = [];
    const collect = async (_env, options) => {
      calls.push(options);
      return { status: 'partial', collectedAt: 'now', sources: {} };
    };
    const body = JSON.stringify({ sources: ['gojobs', 'gojobs'] });
    const response = await handlePublicJobsCollect({ JOB_DB: {} }, request(body), collect);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ sources: ['gojobs'] }]);
  });

  it('rejects invalid JSON and unknown sources without collecting', async () => {
    const collect = async () => assert.fail('must not collect');
    const invalid = await handlePublicJobsCollect({ JOB_DB: {} }, request('{'), collect);
    assert.equal(invalid.status, 400);
    const unknown = await handlePublicJobsCollect(
      { JOB_DB: {} },
      request(JSON.stringify({ sources: ['saramin'] })),
      collect
    );
    assert.equal(unknown.status, 400);
  });

  it('answers 502 when every requested source failed', async () => {
    const collect = async () => ({ status: 'failed', collectedAt: 'now', sources: {} });
    const response = await handlePublicJobsCollect({ JOB_DB: {} }, request(''), collect);
    assert.equal(response.status, 502);
  });
});
