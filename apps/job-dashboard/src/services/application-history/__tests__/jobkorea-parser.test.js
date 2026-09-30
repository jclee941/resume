import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isApplyListPage,
  mapJobKoreaStatus,
  parseJobKoreaApplyList,
  parseJobKoreaPagerLinks,
} from '../jobkorea-parser.js';
import { EXPIRED_HTML, applyListHtml } from './history-test-kit.js';

const ROWS = [
  { company: 'Acme Robotics', no: 40000001, title: 'Platform Engineer', date: '2026.09.03' },
  { company: 'Globex &amp; Sons', no: 40000002, title: 'SRE', read: true, date: '2026.09.02' },
];

describe('parseJobKoreaApplyList', () => {
  it('reads applications, ignores the recommended-postings rows', () => {
    const records = parseJobKoreaApplyList(applyListHtml({ rows: ROWS }));
    assert.deepEqual(
      records.map(({ jobId, company, position, appliedAt, status }) => ({
        jobId,
        company,
        position,
        appliedAt,
        status,
      })),
      [
        {
          jobId: 'jobkorea-40000001',
          company: 'Acme Robotics',
          position: 'Platform Engineer',
          appliedAt: '2026-09-03',
          status: 'applied',
        },
        {
          jobId: 'jobkorea-40000002',
          company: 'Globex & Sons',
          position: 'SRE',
          appliedAt: '2026-09-02',
          status: 'viewed',
        },
      ]
    );
    assert.equal(records[0].source, 'jobkorea');
    assert.equal(records[0].url, 'https://www.jobkorea.co.kr/Recruit/GI_Read/40000001');
    assert.ok(records.every((record) => !record.jobId.endsWith('49999999')));
  });

  it('reuses the status and date of the previous row inside a rowspan group', () => {
    const html = applyListHtml({
      rows: [ROWS[0]],
      carried: [{ company: 'Initech', no: 40000003, title: 'DevOps' }],
    });
    const [, carried] = parseJobKoreaApplyList(html);
    assert.equal(carried.jobId, 'jobkorea-40000003');
    assert.equal(carried.appliedAt, '2026-09-03');
    assert.equal(carried.status, 'applied');
  });

  it('returns nothing for an applied list that is empty', () => {
    assert.deepEqual(parseJobKoreaApplyList(applyListHtml()), []);
  });
});

describe('mapJobKoreaStatus', () => {
  it('maps platform labels onto canonical statuses', () => {
    assert.equal(mapJobKoreaStatus('지원완료', false), 'applied');
    assert.equal(mapJobKoreaStatus('지원완료', true), 'viewed');
    assert.equal(mapJobKoreaStatus('불합격', true), 'rejected');
    assert.equal(mapJobKoreaStatus('최종합격', false), 'offer');
    assert.equal(mapJobKoreaStatus('면접제안', false), 'interview');
    assert.equal(mapJobKoreaStatus('지원취소', false), 'withdrawn');
  });
});

describe('page detection', () => {
  it('recognizes the applied-list page and rejects an expired-session page', () => {
    assert.equal(isApplyListPage(applyListHtml()), true);
    assert.equal(isApplyListPage(EXPIRED_HTML), false);
  });

  it('collects real pager links and skips the current page and script links', () => {
    const pager =
      '<a href="/User/ApplyMng?Page=2&amp;x=1">2</a><a href="javascript:go(3)">3</a><a href="#">4</a>';
    assert.deepEqual(parseJobKoreaPagerLinks(applyListHtml({ pager })), [
      '/User/ApplyMng?Page=2&x=1',
    ]);
    assert.deepEqual(parseJobKoreaPagerLinks(applyListHtml()), []);
  });
});
