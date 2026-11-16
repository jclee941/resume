import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { searchJobs } from '../platforms.js';
import { parseJobKoreaSearchPage } from '../jobkorea-postings.js';
import { searchJobKorea } from '../jobkorea-search.js';

// Live search page records (2026-11-16) with internal and account fields removed, split across two
// flight chunks mid-record like the real page; the 즉시지원 record is repeated as JobKorea does.
const PAGE = await readFile(
  new URL('./fixtures/jobkorea-search-page.html', import.meta.url),
  'utf8'
);
const EMPTY_PAGE = '<html><body></body></html>';
const POSTING_TEXT =
  '<html><body><p>회사 소개 문구</p><h3>자격요건</h3><p>Linux 서버 운영 &amp; 방화벽 정책 관리</p>' +
  '<script>var ignored = 1;</script></body></html>';

/**
 * @param {Record<string, string[]>} pagesByKeyword page HTML per keyword, Page_No 1 first
 */
function searchFetch(pagesByKeyword) {
  /** @type {URL[]} */
  const requests = [];
  /** @type {typeof fetch} */
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/Recruit/GI_Read_Comt_Ifrm') {
      return url.searchParams.get('Gno') === '50369787'
        ? new Response(POSTING_TEXT)
        : new Response('gone', { status: 404 });
    }
    requests.push(url);
    const pages = pagesByKeyword[url.searchParams.get('stext') ?? ''];
    if (!pages) return new Response('blocked', { status: 403 });
    return new Response(pages[Number(url.searchParams.get('Page_No')) - 1] ?? EMPTY_PAGE);
  };
  return { fetchImpl, requests };
}

test('parses every posting record once from flight chunks split mid-record', () => {
  const postings = parseJobKoreaSearchPage(PAGE);
  assert.deepEqual(
    postings.map((posting) => posting.id),
    ['50369787', '50349829', '50301708']
  );
});

test('keeps only 즉시지원 postings, mapped for scoring with their experience and education', async () => {
  const { fetchImpl, requests } = searchFetch({ 보안: [PAGE] });
  const jobs = await searchJobKorea({}, { keywords: ['보안'] }, { fetchImpl });

  assert.deepEqual(
    jobs.map((job) => job.id),
    ['jobkorea-50369787', 'jobkorea-50349829']
  );
  const [experienced, open] = jobs;
  assert.equal(experienced.url, 'https://www.jobkorea.co.kr/Recruit/GI_Read/50369787');
  assert.equal(experienced.company, '대림바스㈜');
  assert.equal(experienced.experience, '5년 이상');
  assert.equal(experienced.location, '서울');
  assert.match(String(experienced.description), /\n자격요건 Linux 서버 운영 & 방화벽 정책 관리$/);
  assert.match(String(experienced.description), /학력: 대졸 이상/);
  assert.equal(open.experience, '0년 이상');
  assert.match(String(open.description), /학력: 학력무관$/);
  assert.match(open.location, /^경기 서울 인천 /);
  assert.equal(requests[0].searchParams.get('filter'), '2');
  assert.equal(requests[0].searchParams.get('tabType'), 'recruit');
});

test('pages until a page adds no new posting', async () => {
  const { fetchImpl, requests } = searchFetch({ 보안: [PAGE, PAGE, PAGE] });
  await searchJobKorea({}, { keywords: ['보안'] }, { fetchImpl });

  assert.deepEqual(
    requests.map((url) => url.searchParams.get('Page_No')),
    ['1', '2']
  );
});

test('a blocked keyword keeps the results of the others; all blocked throws', async () => {
  const { fetchImpl } = searchFetch({ 보안: [PAGE] });
  const jobs = await searchJobKorea({}, { keywords: ['막힘', '보안'] }, { fetchImpl });
  assert.equal(jobs.length, 2);

  await assert.rejects(
    searchJobKorea({}, { keywords: ['막힘'] }, { fetchImpl }),
    /JobKorea search error: 403/
  );
});

test('searchJobs routes jobkorea to the JobKorea search', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = searchFetch({ 보안: [PAGE] }).fetchImpl;
  try {
    const jobs = await searchJobs({ env: {} }, 'jobkorea', { keyword: '보안' });
    assert.equal(jobs.length, 2);
  } finally {
    globalThis.fetch = realFetch;
  }
});
