import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIGTECH_COLLECTORS } from '../index.js';
import { card, daangnDetail, json, line, naver, naverDetail, OPTIONS } from './fixtures.js';

describe('bigtech detail collectors', () => {
  it('reads LINE Gatsby lists/details, filters Korea and omits until-filled sentinel dates', async () => {
    const detailIds = [];
    const rows = [
      line(),
      line({ strapiId: 2, cities: [{ name: 'Tokyo' }] }),
      line({ strapiId: 3, publish: false }),
      line({ strapiId: 4, is_public: false }),
      line({ strapiId: 5, title: 'Server-side Software Engineer' }),
      line({ strapiId: 6, start_date: '2026-12-01T00:00:00Z' }),
      line({ strapiId: 7, until_filled: false, end_date: '2026-11-10T14:59:00Z' }),
    ];
    const fetcher = async (url) => {
      if (url.endsWith('/ko/jobs/page-data.json')) {
        return json({
          result: { data: { allStrapiJobs: { edges: rows.map((node) => ({ node })) } } },
        });
      }
      detailIds.push(url);
      return json({
        result: {
          data: {
            strapiJobs: {
              ...line(),
              content: '<p>보안 운영</p><p>연봉: 회사 내규에 따름</p>',
              countries: [{ name: 'Korea' }],
            },
          },
        },
      });
    };
    const result = await BIGTECH_COLLECTORS.line(fetcher, OPTIONS);
    assert.equal(result.listed, 7);
    assert.equal(detailIds.length, 1);
    assert.equal(result.postings[0].id, 'line-3053');
    assert.equal(result.postings[0].url, 'https://careers.linecorp.com/ko/jobs/3053/');
    assert.equal(result.postings[0].location, 'Bundang');
    assert.equal(result.postings[0].deadline, null);
    assert.equal(result.postings[0].salary, '연봉: 회사 내규에 따름');
  });

  it('keeps LINE future deadlines and isolates candidate detail failures', async () => {
    const rows = [line(), line({ strapiId: 2 })];
    const result = await BIGTECH_COLLECTORS.line(async (url) => {
      if (url.endsWith('/ko/jobs/page-data.json')) {
        return json({
          result: { data: { allStrapiJobs: { edges: rows.map((node) => ({ node })) } } },
        });
      }
      if (url.includes('/2/')) return new Response('missing', { status: 404 });
      return json({
        result: {
          data: {
            strapiJobs: {
              ...line(),
              until_filled: false,
              end_date: '2026-12-01T09:00:00Z',
              content: '<p>network operations</p>',
            },
          },
        },
      });
    }, OPTIONS);
    assert.equal(result.failed, 1);
    assert.equal(result.postings.length, 1);
    assert.equal(result.postings[0].deadline, '2026-12-01T09:00:00Z');
  });

  it('paginates NAVER and reads scoped visible descriptions instead of empty JSON-LD', async () => {
    const offsets = [];
    const result = await BIGTECH_COLLECTORS.naver(async (url) => {
      if (url.includes('/loadJobList.do')) {
        const offset = Number(new URL(url).searchParams.get('firstIndex'));
        offsets.push(offset);
        return json({
          result: 'Y',
          totalSize: 2,
          list: [
            naver(
              offset
                ? {
                    annoId: 2,
                    annoSubject: '사업 기획',
                    jobDetailLink: 'https://recruit.navercorp.com/rcrt/view.do?annoId=2',
                  }
                : {}
            ),
          ],
        });
      }
      return new Response(naverDetail('Linux 커널 및 서버 운영'));
    }, OPTIONS);
    assert.deepEqual(offsets, [0, 1]);
    assert.equal(result.listed, 2);
    assert.equal(result.postings[0].id, 'naver-30005627');
    assert.equal(result.postings[0].company, 'SNOW');
    assert.equal(result.postings[0].location, '경기도 성남시');
    assert.equal(result.postings[0].deadline, '2026-11-15T14:59:00Z');
    assert.match(result.postings[0].description, /Linux 커널/);
    assert.doesNotMatch(result.postings[0].description, /개인정보보호/);
    assert.equal(result.postings[0].salary, null);
  });

  it('extracts NAVER salary from job sections and excludes foreign detail locations', async () => {
    for (const [location, count] of [
      ['경기도 성남시', 1],
      ['Tokyo, Japan', 0],
    ]) {
      const result = await BIGTECH_COLLECTORS.naver(
        async (url) =>
          url.includes('/loadJobList.do')
            ? json({ result: 'Y', totalSize: 1, list: [naver()] })
            : new Response(naverDetail('클라우드 운영<br>급여: 월 500만원 (세전)', location)),
        OPTIONS
      );
      assert.equal(result.postings.length, count);
      if (count) assert.equal(result.postings[0].salary, '급여: 월 500만원 (세전)');
    }
  });

  it('reads Daangn SSR cards and JSON-LD array with a stable role ID and country location', async () => {
    const urls = [];
    const result = await BIGTECH_COLLECTORS.daangn(async (url) => {
      urls.push(url);
      return new Response(
        url.endsWith('/jobs/')
          ? card() + card() + card('2', 'Product Designer') + card('3', 'Security Manager')
          : daangnDetail({ description: '<p>네트워크 운영</p><p>급여: 회사 내규</p>' })
      );
    }, OPTIONS);
    assert.equal(result.listed, 3);
    assert.equal(urls.length, 2);
    assert.equal(result.postings[0].id, 'daangn-5004587003');
    assert.equal(result.postings[0].location, 'KR');
    assert.equal(result.postings[0].salary, '급여: 회사 내규');
    assert.equal(result.postings[0].deadline, null);
  });

  it('validates Daangn detail country, internship type and expiry', async () => {
    for (const patch of [
      { jobLocation: { address: { addressCountry: 'JP' } } },
      { employmentType: 'INTERN' },
      { validThrough: '2026-11-10T18:00:00+09:00' },
    ]) {
      const result = await BIGTECH_COLLECTORS.daangn(
        async (url) => new Response(url.endsWith('/jobs/') ? card() : daangnDetail(patch)),
        OPTIONS
      );
      assert.equal(result.postings.length, 0);
    }
  });

  it('does not follow a NAVER listing URL to an arbitrary origin', async () => {
    const urls = [];
    const result = await BIGTECH_COLLECTORS.naver(async (url) => {
      urls.push(url);
      return json({
        result: 'Y',
        totalSize: 1,
        list: [
          naver({
            jobDetailLink: 'https://evil.invalid/collect',
          }),
        ],
      });
    }, OPTIONS);
    assert.equal(urls.length, 1);
    assert.equal(result.failed, 1);
  });

  for (const source of ['naver', 'line', 'daangn']) {
    it(`${source} rejects broken list payloads`, async () => {
      await assert.rejects(BIGTECH_COLLECTORS[source](async () => new Response('{}'), OPTIONS));
    });
  }
});
