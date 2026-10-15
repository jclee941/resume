import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectCleaneye, listCleaneye, parseCleaneyeBody } from '../cleaneye.js';

const item = (entSeq, sidoCd, entTitle) => ({
  empyear: '2026',
  ypEntId: 'B000771',
  entSeq,
  sidoCd,
  entName: '수원컨벤션센터',
  entTitle,
  pubDate: '2026-10-14',
  pubEndDate: '2026-10-20',
});

const page = (body) => `<html><nav>기관정보 메뉴</nav><main>${body}</main>
<section>기관정보 기관명 수원컨벤션센터 주소 경기</section></html>`;

describe('클린아이 adapter', () => {
  it('pages through the JSON list until the count is covered', async () => {
    const seen = [];
    const fetcher = async (_url, init) => {
      const form = new URLSearchParams(String(init?.body));
      seen.push(`${form.get('status')}:${form.get('pageIndex')}`);
      const list =
        form.get('pageIndex') === '1'
          ? Array.from({ length: 10 }, (_, index) => item(String(index), '007001', `직원 ${index}`))
          : [item('10', '007001', '직원 10'), item('11', '007001', '직원 11')];
      return new Response(JSON.stringify({ cnt: 12, list }));
    };
    const items = await listCleaneye(fetcher, '709001');
    assert.equal(items.length, 12);
    assert.deepEqual(seen, ['709001:1', '709001:2']);
  });

  it('keeps only the 모집분야 section, not the nav header that also says 기관정보', () => {
    const body = parseCleaneyeBody(page('모집분야 및 인원 기술(통신) 6급 네트워크 설비 관리'));
    assert.equal(body, '모집분야 및 인원 기술(통신) 6급 네트워크 설비 관리');
    assert.equal(parseCleaneyeBody('<p>공지 없음</p>'), '');
  });

  it('reads only capital-area candidates and keeps those whose detail is an IT job', async () => {
    const fetched = [];
    const items = [
      item('000004', '007008', '2026 하반기 신입직원 채용 공고'),
      item('000005', '007012', '2026 하반기 신입직원 채용 공고'),
      item('000006', '007001', '기간제 간호사 채용 공고'),
      item('000007', '007004', '2026년 직원 채용'),
    ];
    const fetcher = async (url, init) => {
      if (url.endsWith('selectYpRecruitment.do')) {
        const status = new URLSearchParams(String(init?.body)).get('status');
        const list = status === '709001' ? items : [];
        return new Response(JSON.stringify({ cnt: list.length, list }));
      }
      const seq = new URL(url).searchParams.get('entSeq');
      fetched.push(seq);
      const body =
        seq === '000004'
          ? '모집분야 및 인원 기술(통신) 6급 정보통신망, 스위치 및 네트워크 설비 관리, 정보보안사고 초동 대응'
          : '모집분야 및 인원 수영장 안전요원';
      return new Response(page(body));
    };
    const harvest = await collectCleaneye(fetcher, { budget: 10 });
    assert.deepEqual(fetched.sort(), ['000004', '000007']);
    assert.equal(harvest.listed, 4);
    assert.equal(harvest.candidates, 2);
    assert.equal(harvest.postings.length, 1);
    const [posting] = harvest.postings;
    assert.equal(posting.id, 'cleaneye-2026-B000771-000004');
    assert.equal(
      posting.url,
      'https://job.cleaneye.go.kr/user/ypCareersData.do?empyear=2026&ypEntId=B000771&entSeq=000004'
    );
    assert.equal(posting.location, '경기');
    assert.equal(posting.deadline, '2026-10-20T14:59:59Z');
    assert.ok(posting.terms.includes('네트워크'));
  });
});
