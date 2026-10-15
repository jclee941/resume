import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSqliteD1 } from '../../application-history/__tests__/history-test-kit.js';
import { upsertPublicPostings } from '../repository.js';

const posting = (id, extra = {}) => ({
  id,
  source: 'alio',
  url: `https://job.alio.go.kr/recruitview.do?idx=${id.slice(5)}&utm_source=x`,
  title: `공고 ${id}`,
  company: '기관',
  location: '서울',
  description: 'NCS: 정보통신',
  terms: ['전산'],
  career: '경력',
  score: 90,
  deadline: '2026-10-20T14:59:59Z',
  ...extra,
});

const rows = (db) =>
  db.sqlite
    .prepare(
      'SELECT id, status, position, description, match_score, expires_at, crawled_at, canonical_url, tech_stack FROM job_search_results ORDER BY id'
    )
    .all();

describe('public-jobs repository', () => {
  it('inserts new postings as `new` with a canonical address and term list', async () => {
    const db = createSqliteD1();
    const written = await upsertPublicPostings(
      db,
      [posting('alio-1'), posting('alio-2')],
      new Date('2026-10-15T00:00:00Z')
    );
    assert.equal(written, 2);
    const [first] = rows(db);
    assert.equal(first.status, 'new');
    assert.equal(first.canonical_url, 'https://job.alio.go.kr/recruitview.do?idx=1');
    assert.equal(first.tech_stack, '["전산"]');
    assert.equal(first.crawled_at, '2026-10-15 00:00:00');
  });

  it('re-running is idempotent and never overwrites a reviewed row', async () => {
    const db = createSqliteD1();
    await upsertPublicPostings(
      db,
      [posting('alio-1'), posting('alio-2')],
      new Date('2026-10-15T00:00:00Z')
    );
    db.sqlite
      .prepare(
        "UPDATE job_search_results SET status = 'recommended', description = '[판정] 지원 가능', match_score = 75 WHERE id = 'alio-1'"
      )
      .run();
    const changed = {
      title: '수정된 제목',
      description: 'NCS: 변경',
      score: 50,
      deadline: '2026-10-22T14:59:59Z',
    };
    await upsertPublicPostings(
      db,
      [posting('alio-1', changed), posting('alio-2', changed)],
      new Date('2026-10-15T06:00:00Z')
    );
    const [reviewed, fresh] = rows(db);
    assert.equal(rows(db).length, 2);
    assert.equal(reviewed.status, 'recommended');
    assert.equal(reviewed.position, '공고 alio-1');
    assert.equal(reviewed.description, '[판정] 지원 가능');
    assert.equal(reviewed.match_score, 75);
    assert.equal(reviewed.expires_at, '2026-10-22T14:59:59Z');
    assert.equal(reviewed.crawled_at, '2026-10-15 06:00:00');
    assert.equal(fresh.status, 'new');
    assert.equal(fresh.position, '수정된 제목');
    assert.equal(fresh.description, 'NCS: 변경');
    assert.equal(fresh.match_score, 50);
  });

  it('writes nothing for an empty harvest', async () => {
    const db = createSqliteD1();
    assert.equal(await upsertPublicPostings(db, [], new Date()), 0);
    assert.equal(rows(db).length, 0);
  });
});
