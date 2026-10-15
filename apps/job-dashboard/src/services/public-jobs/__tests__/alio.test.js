import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALIO_IT_NCS,
  collectAlio,
  parseAlioDetail,
  parseAlioList,
  toAlioPosting,
} from '../alio.js';

const row = (idx, no, title, org, location, due) => `
<tr><td><label><input type="checkbox" class="ckbox idxs" name="idxs" value="${idx}" /></label></td>
<td>${no}</td>
<td class="left"> <a href="/recruitview.do?idx=${idx}" target="_blank"/>${title}</a> </td>
<td>${org}</td><td> ${location} </td><td> 정규직 </td><td>2026.10.01</td>
<td> ${due}</br> <span class="orange" style="font-weight: bold;">D-3</span> </td>
<td><span class="orange"> 진행중</span></td></tr>`;

const list = (...rows) =>
  `<table class="tbl type_03"><thead><tr><th>번호</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;

const IT_ROW = row(
  '305584',
  2,
  '직원(행정직(일반,전산)) 공개채용 공고',
  '동북아역사재단',
  '서울',
  '26.10.15'
);
const PLANT_ROW = row(
  '306043',
  1,
  '[수자원] 정수장 시설운영관리 단기계약근로자 채용',
  '수자원공사',
  '충남',
  '26.10.22'
);

const detail = (ncs, field) => `<table><tbody>
<tr><th>표준직무(NCS)</th><td><p>${ncs}</p></td><th>학력정보</th><td>학력무관</td></tr>
<tr><th>근무분야</th><td>${field}</td><th>채용구분</th><td>신입+경력</td></tr>
<tr><th>고용형태</th><td>정규직</td><th>근무지</th><td>서울</td></tr>
<tr><th>채용기간</th><td>26.10.01 ~ 26.10.15</td><th>우대조건</th><td>취업지원대상자</td></tr>
</tbody></table>`;

describe('잡알리오 adapter', () => {
  it('parses list rows with their detail id, total number and deadline', () => {
    const rows = parseAlioList(list(IT_ROW, PLANT_ROW));
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      idx: '305584',
      no: 2,
      title: '직원(행정직(일반,전산)) 공개채용 공고',
      org: '동북아역사재단',
      location: '서울',
      employment: '정규직',
      due: '2026-10-15',
    });
    assert.deepEqual(parseAlioList('<html>no table</html>'), []);
  });

  it('turns an IT detail into a posting and drops a non-IT one', () => {
    const [itRow, plantRow] = parseAlioList(list(IT_ROW, PLANT_ROW));
    const posting = toAlioPosting(
      itRow,
      parseAlioDetail(detail('경영.회계.사무,정보통신', '행정직,전산직'))
    );
    assert.equal(posting?.id, 'alio-305584');
    assert.equal(posting?.url, 'https://job.alio.go.kr/recruitview.do?idx=305584');
    assert.equal(posting?.deadline, '2026-10-15T14:59:59Z');
    assert.equal(posting?.score, 100);
    assert.match(posting?.description ?? '', /NCS: 경영\.회계\.사무,정보통신/);
    assert.equal(toAlioPosting(plantRow, parseAlioDetail(detail('건설', '시설운영'))), null);
  });

  it('reads details only for IT titles and NCS-tagged titles that are not plainly non-IT', async () => {
    const detailIds = [];
    const fetcher = async (url, init) => {
      if (url.startsWith('https://job.alio.go.kr/recruit.do')) {
        const form = new URLSearchParams(String(init?.body));
        assert.equal(form.get('ing'), '2');
        const body =
          form.get('detail_code') === ALIO_IT_NCS ? list(PLANT_ROW) : list(IT_ROW, PLANT_ROW);
        return new Response(body);
      }
      detailIds.push(new URL(url).searchParams.get('idx'));
      return new Response(detail('경영.회계.사무,정보통신', '행정직,전산직'));
    };
    const harvest = await collectAlio(fetcher, { today: '2026-10-15', budget: 10 });
    assert.deepEqual(detailIds, ['305584']);
    assert.equal(harvest.listed, 2);
    assert.equal(harvest.candidates, 1);
    assert.equal(harvest.failed, 0);
    assert.deepEqual(
      harvest.postings.map((posting) => posting.id),
      ['alio-305584']
    );
  });

  it('scores a posting found only through its NCS tag as weak', () => {
    const [itRow] = parseAlioList(list(IT_ROW));
    const generic = { ...itRow, title: '2026년 하반기 신입 채용' };
    const posting = toAlioPosting(generic, parseAlioDetail(detail('사업관리,정보통신', '일반직')));
    assert.deepEqual(posting?.terms, ['정보통신']);
    assert.equal(posting?.score, 80);
  });

  it('fails the source when a list page answers an error', async () => {
    const fetcher = async () => new Response('busy', { status: 503 });
    await assert.rejects(collectAlio(fetcher, { today: '2026-10-15', budget: 10 }), /answered 503/);
  });
});
