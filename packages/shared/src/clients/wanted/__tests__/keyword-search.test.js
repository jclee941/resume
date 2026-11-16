import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WantedAPI } from '../wanted-api.js';

for (const limit of [undefined, 100]) {
  test(`keyword search returns normalized postings with requested limit ${limit}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async (input) => {
      const url = new URL(String(input));
      if (url.pathname !== '/api/chaos/search/v1/position') {
        return new Response('retired search route', { status: 404 });
      }
      const matches =
        url.searchParams.get('country') === 'kr' &&
        url.searchParams.get('query') === '보안 엔지니어' &&
        url.searchParams.get('limit') === '20' &&
        url.searchParams.get('offset') === '0';
      return Response.json({
        total_count: matches ? 478 : 0,
        data: matches
          ? [{ id: 123, position: 'Security Engineer', company: { name: 'Example' } }]
          : [],
      });
    });
    const client = new WantedAPI();

    const result = await client.searchByKeyword('보안 엔지니어', { limit });

    assert.equal(result.total, 478);
    assert.deepEqual(
      result.jobs.map(({ id, position, company, sourceUrl }) => ({
        id,
        position,
        company,
        sourceUrl,
      })),
      [
        {
          id: 123,
          position: 'Security Engineer',
          company: 'Example',
          sourceUrl: 'https://www.wanted.co.kr/wd/123',
        },
      ]
    );
  });
}

for (const finalPageSize of [0, 3]) {
  test(`keyword search stops after a short page of ${finalPageSize}`, async (t) => {
    const offsets = [];
    t.mock.method(globalThis, 'fetch', async (input) => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get('offset'));
      offsets.push(offset);
      const size = offset === 0 ? 20 : finalPageSize;
      return Response.json({
        total_count: 100,
        data: Array.from({ length: size }, (_, index) => ({
          id: offset === 0 ? index : index + 19,
          position: offset === 0 ? 'First page' : 'Second page',
        })),
      });
    });
    const client = new WantedAPI();

    const result = await client.searchByKeyword('보안');

    assert.deepEqual(offsets, [0, 20]);
    assert.deepEqual(
      result.jobs.map(({ id }) => id),
      Array.from({ length: 20 + Math.max(0, finalPageSize - 1) }, (_, id) => id)
    );
    assert.equal(result.jobs[19].position, 'First page');
  });
}

test('keyword search stops after ten full pages even when every page repeats a job', async (t) => {
  const offsets = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(String(input));
    offsets.push(Number(url.searchParams.get('offset')));
    return Response.json({
      total_count: 1000,
      data: Array.from({ length: 20 }, () => ({ id: 1, position: 'Repeated' })),
    });
  });
  const client = new WantedAPI();

  const result = await client.searchByKeyword('보안');

  assert.deepEqual(offsets, [0, 20, 40, 60, 80, 100, 120, 140, 160, 180]);
  assert.deepEqual(
    result.jobs.map(({ id }) => id),
    [1]
  );
});
