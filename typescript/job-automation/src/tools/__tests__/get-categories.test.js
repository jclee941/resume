import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import WantedAPI from '../../shared/clients/wanted/index.js';
import { getCategoriesTool } from '../get-categories.js';

describe('getCategoriesTool', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns success response with category mapping', async () => {
    mock.method(WantedAPI.prototype, 'getTags', async () => ({
      data: [
        {
          id: 1,
          sub_tags: [
            { id: 674, title: 'DevOps / 시스템 관리자' },
            { id: 672, title: '보안 엔지니어' },
          ],
        },
      ],
    }));

    const result = await getCategoriesTool.execute();

    assert.strictEqual(result.success, true);
    assert.ok(result.common_categories.devops);
    assert.ok(Array.isArray(result.all_categories));
    assert.strictEqual(result.all_categories[0].id, 1);
    assert.strictEqual(result.all_categories[0].sub_categories[0].id, 674);
  });

  it('supports array response shape from API', async () => {
    mock.method(WantedAPI.prototype, 'getTags', async () => [
      { id: 10, sub_tags: [{ id: 11, title: 'Backend' }] },
    ]);

    const result = await getCategoriesTool.execute();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.all_categories.length, 1);
    assert.strictEqual(result.all_categories[0].sub_categories[0].title, 'Backend');
  });

  it('handles empty results edge case', async () => {
    mock.method(WantedAPI.prototype, 'getTags', async () => ({ data: [] }));

    const result = await getCategoriesTool.execute();

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.all_categories, []);
  });

  it('returns error response when API fails', async () => {
    mock.method(WantedAPI.prototype, 'getTags', async () => {
      throw new Error('tags unavailable');
    });

    const result = await getCategoriesTool.execute();

    assert.deepStrictEqual(result, {
      success: false,
      error: 'tags unavailable',
    });
  });

  it('defines object input schema for validation', () => {
    assert.strictEqual(getCategoriesTool.inputSchema.type, 'object');
    assert.deepStrictEqual(getCategoriesTool.inputSchema.properties, {});
  });
});
