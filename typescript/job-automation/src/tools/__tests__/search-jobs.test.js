import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import WantedAPI from '../../shared/clients/wanted/index.js';
import { searchJobsTool } from '../search-jobs.js';

describe('searchJobsTool', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns success response with expected shape', async () => {
    const searchJobsMock = mock.method(WantedAPI.prototype, 'searchJobs', async () => ({
      total: 1,
      jobs: [{ id: 101, position: 'DevOps Engineer' }],
      links: { next: '/api/v4/jobs?offset=1' },
    }));

    const result = await searchJobsTool.execute({ tag_type_ids: [674], offset: 10 });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.has_more, true);
    assert.strictEqual(result.next_offset, 11);
    assert.ok(Array.isArray(result.jobs));
    assert.strictEqual(searchJobsMock.mock.calls.length, 1);
  });

  it('returns error response when API fails', async () => {
    mock.method(WantedAPI.prototype, 'searchJobs', async () => {
      throw new Error('wanted api unavailable');
    });

    const result = await searchJobsTool.execute({ tag_type_ids: [674] });

    assert.deepStrictEqual(result, {
      success: false,
      error: 'wanted api unavailable',
    });
  });

  it('uses default params with minimal input', async () => {
    const searchJobsMock = mock.method(WantedAPI.prototype, 'searchJobs', async () => ({
      total: 0,
      jobs: [],
      links: {},
    }));

    const result = await searchJobsTool.execute({});

    assert.strictEqual(result.success, true);
    const callArgs = searchJobsMock.mock.calls[0].arguments[0];
    assert.deepStrictEqual(callArgs, {
      country: 'kr',
      tag_type_ids: undefined,
      locations: 'all',
      years: -1,
      limit: 20,
      offset: 0,
    });
  });

  it('caps limit to 100 for edge cases', async () => {
    const searchJobsMock = mock.method(WantedAPI.prototype, 'searchJobs', async () => ({
      total: 0,
      jobs: [],
      links: {},
    }));

    await searchJobsTool.execute({ limit: 500 });

    const callArgs = searchJobsMock.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.limit, 100);
  });

  it('defines input schema fields for validation', () => {
    assert.strictEqual(searchJobsTool.inputSchema.type, 'object');
    assert.ok(searchJobsTool.inputSchema.properties.tag_type_ids);
    assert.ok(searchJobsTool.inputSchema.properties.limit);
    assert.ok(searchJobsTool.inputSchema.properties.offset);
  });
});
