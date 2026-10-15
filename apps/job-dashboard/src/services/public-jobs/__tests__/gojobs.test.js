import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectGojobs, parseGojobsDetail, parseGojobsList, searchGojobs } from '../gojobs.js';

const row = (sn, title, org, posted, due) => `
<tr ><td align="center" scope="row">1</td>
<td class="ta_l elip"><div><img src="/images/icon/rec_img3.png" alt="공공"/></div>
<a href="javascript:fn_apmView('020', '${sn}')"> ${title} </a></td>
<td align="center"> ${org} </td><td align="center"> ${posted}</b> </td>
<td align="center" style="color: #909090;"> ${due} </td><td>12</td></tr>`;

const list = (...rows) =>
  `<table><thead><tr><th>번호</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;

const detail = (title, grade, area) => `<header>과학기술정보통신부 메뉴</header>
<div>${title} 기관명 x 채용직급 ${grade} 근무지역 ${area} 장애인 채용 / 우대 해당없음</div>
<!-- 목록 --><footer>과학기술정보통신부 정보통신 정보보안</footer>`;

describe('나라일터 adapter', () => {
  it('parses rows with the posting serial, organization and dates', () => {
    const rows = parseGojobsList(
      list(
        row(
          '305351',
          '일반직공무원[전산주사보] 채용 공고',
          '행정중심복합도시건설청',
          '2026-10-08',
          '2026-10-19'
        )
      )
    );
    assert.deepEqual(rows, [
      {
        sn: '305351',
        title: '일반직공무원[전산주사보] 채용 공고',
        org: '행정중심복합도시건설청',
        posted: '2026-10-08',
        due: '2026-10-19',
      },
    ]);
  });

  it('stops paging once a page reaches closed postings', async () => {
    const pages = [];
    const fetcher = async (url) => {
      pages.push(new URL(url).searchParams.get('pageIndex'));
      return new Response(
        list(
          row('1', '전산 채용', '기관', '2026-10-10', '2026-10-20'),
          row('2', '전산 채용', '기관', '2026-05-06', '2026-05-20')
        )
      );
    };
    const rows = await searchGojobs(fetcher, '전산', '2026-10-15');
    assert.deepEqual(pages, ['1']);
    assert.deepEqual(
      rows.map((r) => r.sn),
      ['1']
    );
  });

  it('cuts the detail before the ministry footer and reads 채용직급·근무지역', () => {
    const parsed = parseGojobsDetail(detail('전산 8급 경채', '전산서기 1명', '경상북도 안동시'));
    assert.equal(parsed.grade, '전산서기 1명');
    assert.equal(parsed.area, '경상북도 안동시');
    assert.ok(!parsed.text.includes('정보보안'));
  });

  it('drops result notices and organization-name-only matches before reading details', async () => {
    const details = [];
    const fetcher = async (url) => {
      if (url.includes('apmList.do')) {
        return new Response(
          list(
            row(
              '11',
              '국가공무원(사서, 전산) 경력경쟁채용 공고',
              '국립경국대학교',
              '2026-10-08',
              '2026-10-19'
            ),
            row(
              '12',
              '과학기술정보통신부 기간제 근로자(비서) 채용공고',
              '과학기술정보통신부',
              '2026-10-14',
              '2026-10-21'
            ),
            row(
              '13',
              '전산사무관 서류전형 합격자 및 면접시험 일정 공고',
              '개인정보보호위원회',
              '2026-10-12',
              '2026-10-15'
            )
          )
        );
      }
      details.push(new URL(url).searchParams.get('empmnsn'));
      return new Response(
        detail('국가공무원(사서, 전산) 경력경쟁채용 공고', '전산서기 1명', '경상북도 안동시')
      );
    };
    const harvest = await collectGojobs(fetcher, { today: '2026-10-15', budget: 10 });
    assert.deepEqual(details, ['11']);
    assert.equal(harvest.listed, 2);
    assert.equal(harvest.candidates, 1);
    const [posting] = harvest.postings;
    assert.equal(posting.id, 'gojobs-11');
    assert.equal(posting.url, 'https://www.gojobs.go.kr/apmView.do?empmnsn=11');
    assert.equal(posting.location, '경상북도 안동시');
    assert.equal(posting.deadline, '2026-10-19T14:59:59Z');
  });
});
