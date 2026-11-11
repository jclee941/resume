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

function siteFetcher({ alioStatus = 200, alioDetail = ALIO_DETAIL } = {}) {
  return async (url) => {
    if (url.startsWith('https://job.alio.go.kr/recruit.do')) {
      return new Response(alioStatus === 200 ? ALIO_LIST : 'down', { status: alioStatus });
    }
    if (url.startsWith('https://job.alio.go.kr/recruitview.do')) return new Response(alioDetail);
    if (url.includes('selectYpRecruitment.do'))
      return new Response(JSON.stringify({ cnt: 0, list: [] }));
    if (url.includes('apmList.do')) return new Response('<table><tbody></tbody></table>');
    if (url.includes('amazon.jobs')) return Response.json({ hits: 0, jobs: [] });
    if (url.includes('careers.linecorp.com'))
      return Response.json({ result: { data: { allStrapiJobs: { edges: [] } } } });
    if (url.includes('loadJobList.do'))
      return Response.json({ result: 'Y', totalSize: 0, list: [] });
    if (url.includes('careers.daangn.com')) return new Response('<main data-job-card></main>');
    if (url.includes('careers.kakao.com'))
      return Response.json({ jobList: [], totalJobCount: 0, totalPage: 0 });
    throw new Error(`unexpected fetch ${url}`);
  };
}

const clock = () => new Date('2026-10-15T01:00:00Z');

describe('collectPublicJobs', () => {
  for (const [field, value, expected] of [
    ['연봉', '5,000~6,000만원', '연봉: 5,000~6,000만원'],
    ['급여', '월 300만원 (세전)', '급여: 월 300만원 (세전)'],
    ['보수', '내규에 따름 <협의>', '보수: 내규에 따름 &lt;협의&gt;'],
    ['', '', '미공개 (공고 확인)'],
  ]) {
    it(`queues the published pay without inventing an annual amount: ${field || 'undisclosed'}`, async () => {
      const db = createSqliteD1();
      const messages = [];
      const salaryField = field
        ? `<tr><th>${field}</th><td>${value.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td></tr>`
        : '';
      const summary = await collectPublicJobs(
        {
          JOB_DB: db,
          NOTIFICATION_QUEUE: { send: async (message) => void messages.push(message) },
        },
        {
          fetcher: siteFetcher({
            alioDetail: ALIO_DETAIL.replace('</table>', `${salaryField}</table>`),
          }),
          clock,
          sources: ['alio'],
        }
      );
      assert.deepEqual(summary.notifications, { queued: 1, failed: 0 });
      assert.equal(messages.length, 1);
      assert.equal(messages[0].id, 'public-job:alio-305702');
      assert.equal(messages[0].type, 'telegram');
      assert.equal(messages[0].payload.postingId, 'alio-305702');
      assert.match(messages[0].payload.text, /한국수출입은행/);
      assert.ok(messages[0].payload.text.includes(`연봉·급여: ${expected}`));
      if (field) {
        const saved = db.sqlite.prepare('SELECT description FROM job_search_results').get();
        assert.ok(saved.description.includes(`${field}: ${value}`));
      }
      assert.match(
        messages[0].payload.text,
        /https:\/\/job\.alio\.go\.kr\/recruitview\.do\?idx=305702/
      );
    });
  }

  it('keeps delivered, ineligible and already closed postings out of the notification queue', async () => {
    for (const state of ['delivered', 'ineligible', 'closed']) {
      const db = createSqliteD1();
      db.sqlite
        .prepare(
          `INSERT INTO job_search_results (
            id, source, position, company, status, crawled_at, created_at, updated_at, expires_at
          ) VALUES (?, 'alio', 'IT 채용', '기관', ?, 'now', 'now', 'now', ?)`
        )
        .run(
          'alio-305702',
          state === 'ineligible' ? 'ineligible' : 'recommended',
          state === 'closed' ? '2026-10-19T09:00:00Z' : '2026-10-19T14:59:59Z'
        );
      if (state === 'delivered') {
        db.sqlite
          .prepare(
            `INSERT INTO notification_history (id, event_type, data, channels, timestamp, status)
             VALUES ('public-job:alio-305702', 'public_job', '{}', '["telegram"]', 'now', 'success')`
          )
          .run();
      }
      const messages = [];
      const summary = await collectPublicJobs(
        {
          JOB_DB: db,
          NOTIFICATION_QUEUE: { send: async (message) => void messages.push(message) },
        },
        {
          fetcher: siteFetcher(),
          clock: () => new Date('2026-10-19T12:00:00Z'),
          sources: ['alio'],
        }
      );
      assert.deepEqual(summary.notifications, { queued: 0, failed: 0 }, state);
      assert.equal(messages.length, 0, state);
    }
  });

  it('reports a queue failure while preserving the collected posting', async () => {
    const db = createSqliteD1();
    const summary = await collectPublicJobs(
      {
        JOB_DB: db,
        NOTIFICATION_QUEUE: {
          send: async () => {
            throw new Error('notification queue unavailable');
          },
        },
      },
      { fetcher: siteFetcher(), clock, sources: ['alio'] }
    );
    assert.equal(summary.status, 'partial');
    assert.equal(summary.sources.alio.saved, 1);
    assert.deepEqual(summary.notifications, {
      queued: 0,
      failed: 1,
      error: 'notification queue unavailable',
    });
    assert.equal(
      db.sqlite.prepare('SELECT COUNT(*) AS count FROM job_search_results').get().count,
      1
    );
  });

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
