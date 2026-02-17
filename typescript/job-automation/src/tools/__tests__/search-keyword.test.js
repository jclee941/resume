import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import WantedAPI from '../../shared/clients/wanted/index.js';
import { searchKeywordTool } from '../search-keyword.js';

describe('searchKeywordTool', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns success response with mapped jobs', async () => {
    mock.method(WantedAPI.prototype, 'searchByKeyword', async () => ({
      data: {
        jobs: [
          {
            id: 325174,
            position: 'DevOps Engineer',
            company: { name: 'Toss', industry_name: 'Fintech' },
            address: { full_location: 'Seoul' },
            annual_from: 3,
            annual_to: 8,
            highlight: 'Kubernetes experience',
          },
        ],
      },
    }));

    const result = await searchKeywordTool.execute({ query: 'devops' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.query, 'devops');
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.jobs[0].company, 'Toss');
    assert.strictEqual(result.jobs[0].url, 'https://www.wanted.co.kr/wd/325174');
  });

  it('returns error response when API fails', async () => {
    mock.method(WantedAPI.prototype, 'searchByKeyword', async () => {
      throw new Error('search failed');
    });

    const result = await searchKeywordTool.execute({ query: 'devops' });

    assert.deepStrictEqual(result, {
      success: false,
      error: 'search failed',
    });
  });

  it('uses default params with minimal input', async () => {
    const searchByKeywordMock = mock.method(WantedAPI.prototype, 'searchByKeyword', async () => ({
      data: { jobs: [] },
    }));

    const result = await searchKeywordTool.execute({ query: 'python' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.total, 0);
    assert.strictEqual(searchByKeywordMock.mock.calls.length, 1);

    const options = searchByKeywordMock.mock.calls[0].arguments[1];
    assert.deepStrictEqual(options, {
      limit: 20,
      offset: 0,
      years: undefined,
    });
  });

  it('caps limit to 100 for edge cases', async () => {
    const searchByKeywordMock = mock.method(WantedAPI.prototype, 'searchByKeyword', async () => ({
      data: { jobs: [] },
    }));

    await searchKeywordTool.execute({ query: 'kubernetes', limit: 999 });

    const options = searchByKeywordMock.mock.calls[0].arguments[1];
    assert.strictEqual(options.limit, 100);
  });

  it('requires query in input schema', () => {
    assert.strictEqual(searchKeywordTool.inputSchema.type, 'object');
    assert.deepStrictEqual(searchKeywordTool.inputSchema.required, ['query']);
    assert.ok(searchKeywordTool.inputSchema.properties.query);
  });
});
