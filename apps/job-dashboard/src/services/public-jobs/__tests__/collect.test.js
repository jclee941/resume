import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSqliteD1 } from '../../application-history/__tests__/history-test-kit.js';
import { collectPublicJobs } from '../collect.js';

const ALIO_LIST = `<table class="tbl type_03"><tbody><tr>
<td><input type="checkbox" name="idxs" value="305702" /></td><td>1</td>
<td class="left"><a href="/recruitview.do?idx=305702" target="_blank"/>전문직행원(신입) IT 채용</a></td>
<td>한국수출입은행</td><td> 서울 </td><td> 정규직 </td><td>2026.10.02</td><td> 26.10.19</br></td><td>진행중</td>
</tr></tbody></table>`;
const ALIO_DETAIL = `<table><tr><th>표준직무(NCS)</th><td>정보통신</td><th>학력정보</th><td>학력무관</td></tr>
<tr><th>근무지</th><td>서울</td><th>채용기간</th><td>26.10.02 ~ 26.10.19</td></tr></table>`;

function siteFetcher({ alioStatus = 200 } = {}) {
  return async (url) => {
    if (url.startsWith('https://job.alio.go.kr/recruit.do')) {
      return new Response(alioStatus === 200 ? ALIO_LIST : 'down', { status: alioStatus });
    }
    if (url.startsWith('https://job.alio.go.kr/recruitview.do')) return new Response(ALIO_DETAIL);
    if (url.includes('selectYpRecruitment.do'))
      return new Response(JSON.stringify({ cnt: 0, list: [] }));
    if (url.includes('apmList.do')) return new Response('<table><tbody></tbody></table>');
    throw new Error(`unexpected fetch ${url}`);
  };
}

const clock = () => new Date('2026-10-15T01:00:00Z');

describe('collectPublicJobs', () => {
  it('saves each source and reports per-source counts', async () => {
    const db = createSqliteD1();
    const summary = await collectPublicJobs({ JOB_DB: db }, { fetcher: siteFetcher(), clock });
    assert.equal(summary.status, 'success');
    assert.equal(summary.collectedAt, '2026-10-15T01:00:00.000Z');
    assert.deepEqual(summary.sources.alio, { listed: 1, candidates: 1, failed: 0, saved: 1 });
    assert.deepEqual(summary.sources.cleaneye, { listed: 0, candidates: 0, failed: 0, saved: 0 });
    assert.deepEqual(summary.sources.gojobs, { listed: 0, candidates: 0, failed: 0, saved: 0 });
    const saved = db.sqlite
      .prepare('SELECT id, source, status, expires_at FROM job_search_results')
      .all()
      .map((row) => ({ ...row }));
    assert.deepEqual(saved, [
      { id: 'alio-305702', source: 'alio', status: 'new', expires_at: '2026-10-19T14:59:59Z' },
    ]);
  });

  it('reports a failing source and still saves the others', async () => {
    const db = createSqliteD1();
    const summary = await collectPublicJobs(
      { JOB_DB: db },
      { fetcher: siteFetcher({ alioStatus: 503 }), clock }
    );
    assert.equal(summary.status, 'partial');
    assert.match(summary.sources.alio?.error ?? '', /job\.alio\.go\.kr answered 503/);
    assert.equal(summary.sources.gojobs?.saved, 0);
  });

  it('runs only the requested sources and fails when all of them fail', async () => {
    const db = createSqliteD1();
    const summary = await collectPublicJobs(
      { JOB_DB: db },
      { fetcher: siteFetcher({ alioStatus: 500 }), clock, sources: ['alio'] }
    );
    assert.equal(summary.status, 'failed');
    assert.deepEqual(Object.keys(summary.sources), ['alio']);
  });
});
