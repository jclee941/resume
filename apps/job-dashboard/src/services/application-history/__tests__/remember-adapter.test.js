import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { HistorySyncError } from '../history-types.js';
import {
  REMEMBER_HISTORY_URL,
  fetchRememberHistory,
  toRememberRecord,
} from '../remember-adapter.js';
import { syncApplicationHistory } from '../sync.js';
import { createSqliteD1, sessionEnv } from './history-test-kit.js';

const realFetch = globalThis.fetch;

const posting = (id, application = {}) => ({
  id,
  title: `Role ${id}`,
  organization: { name: `Company ${id}` },
  application: {
    status: 'applied',
    applied_at: '2026-10-02T19:25:25.412+09:00',
    canceled_at: null,
    ...application,
  },
});

function serveHistory(pages) {
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    const target = new URL(String(url));
    if (`${target.origin}${target.pathname}` !== REMEMBER_HISTORY_URL) {
      throw new Error(`unexpected request ${target}`);
    }
    const page = Number(target.searchParams.get('page'));
    requests.push({
      page,
      per: Number(target.searchParams.get('per')),
      auth: init.headers?.Authorization,
    });
    return Response.json({ data: pages[page - 1] ?? [], meta: {} });
  };
  return requests;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('toRememberRecord', () => {
  it('maps an applied posting and converts the KST application time to UTC', () => {
    assert.deepEqual(toRememberRecord(posting(42)), {
      source: 'remember',
      jobId: 'remember-42',
      company: 'Company 42',
      position: 'Role 42',
      url: 'https://career.rememberapp.co.kr/job/posting/42',
      appliedAt: '2026-10-02T10:25:25.412Z',
      status: 'applied',
    });
  });

  it('maps a cancelled application to withdrawn', () => {
    const record = toRememberRecord(posting(7, { canceled_at: '2026-10-02T19:37:25+09:00' }));
    assert.equal(record?.status, 'withdrawn');
  });

  it('maps the progress timestamps Remember keeps beside status "applied"', () => {
    const at = '2026-10-09T16:44:42.400+09:00';
    const statusOf = (application) => toRememberRecord(posting(9, application))?.status;
    assert.equal(statusOf({}), 'applied');
    assert.equal(statusOf({ first_read_at: at }), 'viewed');
    assert.equal(statusOf({ reviewed_at: at }), 'viewed');
    assert.equal(statusOf({ first_read_at: at, resume_accepted_at: at }), 'in_progress');
    assert.equal(statusOf({ resume_accepted_at: at, final_accepted_at: at }), 'offer');
    assert.equal(statusOf({ resume_accepted_at: at, rejected_at: at }), 'rejected');
    assert.equal(statusOf({ rejected_at: at, canceled_at: at }), 'withdrawn');
  });

  it('skips a posting without an id', () => {
    assert.equal(toRememberRecord({ title: 'No id' }), null);
  });
});

describe('fetchRememberHistory', () => {
  it('pages by 50 until a short page and sends the stored token', async () => {
    const env = await sessionEnv(createSqliteD1(), ['remember']);
    const firstPage = Array.from({ length: 50 }, (_, index) => posting(index + 1));
    const requests = serveHistory([firstPage, [posting(51)]]);

    const records = await fetchRememberHistory(env);

    assert.equal(records.length, 51);
    assert.deepEqual(
      requests.map(({ page, per }) => [page, per]),
      [
        [1, 50],
        [2, 50],
      ]
    );
    assert.ok(requests.every((request) => request.auth === 'Token token=session=fake'));
  });

  it('reports SESSION_MISSING without reading history when no session or login is available', async () => {
    const env = await sessionEnv(createSqliteD1());
    const requests = serveHistory([]);

    await assert.rejects(
      fetchRememberHistory(env),
      (error) => error instanceof HistorySyncError && error.code === 'SESSION_MISSING'
    );
    assert.equal(requests.length, 0);
  });
});

describe('syncApplicationHistory for remember', () => {
  it('writes applied and withdrawn rows and keeps them on a re-sync', async () => {
    const db = createSqliteD1();
    const env = await sessionEnv(db, ['remember']);
    serveHistory([[posting(1), posting(2, { canceled_at: '2026-10-02T19:37:25+09:00' })]]);

    const first = await syncApplicationHistory(env, { platforms: ['remember'] });
    const second = await syncApplicationHistory(env, { platforms: ['remember'] });

    const rows = db.sqlite
      .prepare(
        "SELECT job_id, status, applied_at FROM applications WHERE source = 'remember' ORDER BY job_id"
      )
      .all();
    assert.deepEqual(
      rows.map((row) => [row.job_id, row.status, row.applied_at]),
      [
        ['remember-1', 'applied', '2026-10-02T10:25:25.412Z'],
        ['remember-2', 'withdrawn', '2026-10-02T10:25:25.412Z'],
      ]
    );
    assert.equal(first.platforms.remember.inserted, 2);
    assert.equal(second.platforms.remember.inserted, 0);
  });

  it('moves a stored application to rejected once Remember records the rejection', async () => {
    const db = createSqliteD1();
    const env = await sessionEnv(db, ['remember']);
    serveHistory([[posting(3)]]);
    await syncApplicationHistory(env, { platforms: ['remember'] });

    serveHistory([[posting(3, { rejected_at: '2026-10-11T10:00:00+09:00' })]]);
    const resync = await syncApplicationHistory(env, { platforms: ['remember'] });

    const row = db.sqlite
      .prepare("SELECT status FROM applications WHERE job_id = 'remember-3'")
      .get();
    assert.equal(row.status, 'rejected');
    assert.equal(resync.platforms.remember.updated, 1);
  });
});
