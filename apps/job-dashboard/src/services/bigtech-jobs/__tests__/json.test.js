import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIGTECH_COLLECTORS } from '../index.js';
import { amazon, json, kakao, OPTIONS } from './fixtures.js';

describe('bigtech JSON collectors', () => {
  it('exports the five independent source IDs', () => {
    assert.deepEqual(Object.keys(BIGTECH_COLLECTORS).sort(), [
      'amazon',
      'daangn',
      'kakao',
      'line',
      'naver',
    ]);
  });

  it('reads Amazon Korea pagination and preserves posting IDs and salary wording', async () => {
    const offsets = [];
    const fetcher = async (url) => {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get('normalized_country_code[]'), 'KOR');
      const offset = Number(parsed.searchParams.get('offset'));
      offsets.push(offset);
      return json({
        hits: 2,
        jobs: [
          amazon(
            offset
              ? {
                  id_icims: '2',
                  job_path: '/en/jobs/2/network-engineer',
                  title: 'Network Engineer',
                }
              : { description: '<p>Salary: KRW 6,000,000 per month</p>' }
          ),
        ],
      });
    };
    const result = await BIGTECH_COLLECTORS.amazon(fetcher, OPTIONS);
    assert.deepEqual(offsets, [0, 1]);
    assert.equal(result.listed, 2);
    assert.equal(result.postings[0].id, 'amazon-10595030');
    assert.equal(result.postings[0].salary, 'Salary: KRW 6,000,000 per month');
    assert.equal(result.postings[0].deadline, null);
    assert.equal(result.postings[1].salary, null);
    assert.equal(result.postings[1].url, 'https://www.amazon.jobs/en/jobs/2/network-engineer');
  });

  it('excludes foreign, business, general software, leadership, intern and physical roles', async () => {
    const titles = [
      'Software Development Engineer',
      'Business Development Manager',
      'Security Manager',
      'Director of Infrastructure',
      'Network Deployment Build Lead',
      'Cloud Engineer Intern',
      'Datacenter Security Specialist',
      'Colo Physical Security Architect',
      'Data Center Engineering Operations Engineer, DCEO',
      'LINE SRE Dev Engineer',
      'DevOps Engineer',
      'Senior Cloud Security Engineer',
      'Privacy Engineer',
      'AI Platform 추론 최적화 Engineer(경력)',
    ];
    const jobs = titles.map((title, id) => amazon({ title, id_icims: String(id) }));
    jobs.push(amazon({ country_code: 'USA', location: 'US, Seattle' }));
    jobs.push(
      amazon({
        title: 'Security Engineer',
        description: 'Physical security, CCTV and guard operations.',
      })
    );
    jobs.push(amazon({ title: 'Senior Security Operations Engineer' }));
    const result = await BIGTECH_COLLECTORS.amazon(
      async () => json({ hits: jobs.length, jobs }),
      OPTIONS
    );
    assert.deepEqual(
      result.postings.map((p) => p.title),
      ['Senior Security Operations Engineer']
    );
    assert.equal(result.postings[0].source, 'amazon');
  });

  it('uses Kakao full list bodies without optional detail reads and preserves exact KST time', async () => {
    const pages = [];
    const fetcher = async (url) => {
      pages.push(new URL(url).searchParams.get('page'));
      return json({
        totalPage: 2,
        totalJobCount: 2,
        jobList: [
          kakao(
            pages.length === 1
              ? {
                  resumeSubmissionEndDatetime: '2026-12-01T18:00:00',
                  workContentDesc: '<p>급여: 월 600만원 (세전)</p><p>지원자격: 경력</p>',
                }
              : { realId: 'P-2', jobOfferTitle: '네트워크 엔지니어' }
          ),
        ],
      });
    };
    const result = await BIGTECH_COLLECTORS.kakao(fetcher, OPTIONS);
    assert.deepEqual(pages, ['1', '2']);
    assert.equal(result.postings[0].id, 'kakao-P-14469');
    assert.equal(result.postings[0].url, 'https://careers.kakao.com/jobs/P-14469');
    assert.equal(result.postings[0].deadline, '2026-12-01T09:00:00Z');
    assert.equal(result.postings[0].salary, '급여: 월 600만원 (세전)');
    assert.match(result.postings[0].description, /GPU|급여/);
  });

  it('filters closed, private, expired and foreign Kakao records', async () => {
    const jobs = [
      kakao({ closeFlag: true }),
      kakao({ privateFlag: true }),
      kakao({ useFlag: false }),
      kakao({ statusCode: 'CLOSED' }),
      kakao({ locationName: 'Tokyo' }),
      kakao({ resumeSubmissionEndDatetime: '2026-11-10T18:00:00' }),
      kakao(),
    ];
    const result = await BIGTECH_COLLECTORS.kakao(
      async () => json({ jobList: jobs, totalPage: 1, totalJobCount: jobs.length }),
      OPTIONS
    );
    assert.equal(result.postings.length, 1);
  });

  it('caps candidate processing at budget while retaining the list count', async () => {
    const jobs = [amazon(), amazon({ id_icims: '2' })];
    const result = await BIGTECH_COLLECTORS.amazon(async () => json({ hits: 2, jobs }), {
      ...OPTIONS,
      budget: 1,
    });
    assert.equal(result.listed, 2);
    assert.equal(result.candidates, 1);
    assert.equal(result.postings.length, 1);
  });

  for (const source of ['amazon', 'kakao']) {
    it(`${source} rejects unavailable and malformed list responses`, async () => {
      await assert.rejects(
        BIGTECH_COLLECTORS[source](async () => new Response('blocked', { status: 403 }), OPTIONS),
        /403/
      );
      await assert.rejects(BIGTECH_COLLECTORS[source](async () => json({}), OPTIONS));
    });
  }
});
