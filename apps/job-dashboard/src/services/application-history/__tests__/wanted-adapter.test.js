import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { HistorySyncError } from '../history-types.js';
import { fetchWantedHistory } from '../wanted-adapter.js';
import { createSqliteD1, sessionEnv } from './history-test-kit.js';

const item = (id, jobId, extra = {}) => ({
  id,
  job: { id: jobId },
  company_name: `Company ${jobId}`,
  position: `Role ${jobId}`,
  apply_time: '2026-09-01T10:00:00',
  read_time: null,
  ...extra,
});

function fakeWanted(pages, { failWith } = {}) {
  const requests = [];
  const fetcher = async (url, init) => {
    const { searchParams } = new URL(url);
    const status = searchParams.get('status');
    const index = Number(searchParams.get('offset')) / Number(searchParams.get('limit'));
    requests.push({ status, index, cookie: init.headers.Cookie });
    if (failWith) return new Response('{}', { status: failWith });
    const statusPages = pages[status] ?? [[]];
    const body = {
      total: 0,
      data: statusPages[index] ?? [],
      links: { next: statusPages[index + 1] ? '/next' : null },
    };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return { fetcher, requests };
}

describe('fetchWantedHistory', () => {
  it('pages every status filter and maps items onto canonical statuses', async () => {
    const env = await sessionEnv(createSqliteD1(), ['wanted']);
    const { fetcher, requests } = fakeWanted({
      reject: [[item(1, 101)], [item(2, 102)]],
      pass: [[item(3, 103)]],
      hire: [[item(4, 104)]],
      complete: [[item(5, 105), item(6, 106, { read_time: '2026-09-02T09:00:00' })]],
    });

    const records = await fetchWantedHistory(env, { fetcher });

    assert.deepEqual(records.map(({ jobId, status }) => [jobId, status]).sort(), [
      ['wanted-101', 'rejected'],
      ['wanted-102', 'rejected'],
      ['wanted-103', 'in_progress'],
      ['wanted-104', 'offer'],
      ['wanted-105', 'applied'],
      ['wanted-106', 'viewed'],
    ]);
    assert.deepEqual(
      requests.filter((request) => request.status === 'reject').map((request) => request.index),
      [0, 1]
    );
    assert.deepEqual([...new Set(requests.map((request) => request.status))].sort(), [
      'complete',
      'hire',
      'pass',
      'reject',
    ]);
    assert.ok(requests.every((request) => request.cookie === 'session=fake'));
    const rejected = records.find((record) => record.jobId === 'wanted-101');
    assert.equal(rejected.url, 'https://www.wanted.co.kr/wd/101');
    assert.equal(rejected.source, 'wanted');
  });

  it('skips items that carry no job id', async () => {
    const env = await sessionEnv(createSqliteD1(), ['wanted']);
    const { fetcher } = fakeWanted({ reject: [[item(1, 101), { id: 2, job: null }]] });
    assert.equal((await fetchWantedHistory(env, { fetcher })).length, 1);
  });

  it('fails with SESSION_MISSING and never calls Wanted when KV holds no session', async () => {
    const env = await sessionEnv(createSqliteD1());
    const { fetcher, requests } = fakeWanted({});
    await assert.rejects(fetchWantedHistory(env, { fetcher }), (error) => {
      assert.ok(error instanceof HistorySyncError);
      assert.equal(error.code, 'SESSION_MISSING');
      return true;
    });
    assert.equal(requests.length, 0);
  });

  it('maps 401 to SESSION_EXPIRED and other failures to UPSTREAM_ERROR', async () => {
    const env = await sessionEnv(createSqliteD1(), ['wanted']);
    await assert.rejects(
      fetchWantedHistory(env, { fetcher: fakeWanted({}, { failWith: 401 }).fetcher }),
      { code: 'SESSION_EXPIRED' }
    );
    await assert.rejects(
      fetchWantedHistory(env, { fetcher: fakeWanted({}, { failWith: 422 }).fetcher }),
      { code: 'UPSTREAM_ERROR' }
    );
  });
});
