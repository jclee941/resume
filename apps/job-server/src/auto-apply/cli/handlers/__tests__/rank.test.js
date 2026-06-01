import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRankedReport,
  mergeAndRankResults,
  mergeDetailIntoJob,
  rescoreJobs,
  parsePositiveInt,
  enrichTopJobs,
  buildSubmitQueue,
} from '../rank.js';

const sampleJobs = [
  {
    id: 'wanted_1',
    source: 'wanted',
    position: 'DevSecOps Engineer',
    company: 'AlphaSec',
    location: '서울 강남구',
    sourceUrl: 'https://www.wanted.co.kr/wd/1',
    matchScore: 80,
    matchPercentage: 82,
    applicationPriority: 'high',
    matchDetails: {
      skillMatches: [{ category: 'security', keyword: 'devsecops' }],
      bonusPoints: [],
    },
  },
  {
    id: 'jobkorea_2',
    source: 'jobkorea',
    position: 'SRE',
    company: 'BetaCloud',
    location: '서울',
    sourceUrl: 'https://www.jobkorea.co.kr/Recruit/GI_Read/2',
    matchScore: 64,
    matchPercentage: 64,
    applicationPriority: 'low',
    matchDetails: { skillMatches: [], bonusPoints: [] },
  },
  {
    id: 'saramin_3',
    source: 'saramin',
    position: 'Junior Helpdesk',
    company: 'GammaCorp',
    location: '대전',
    sourceUrl: 'https://www.saramin.co.kr/3',
    matchScore: 30,
    matchPercentage: 30,
    applicationPriority: 'low',
    matchDetails: { skillMatches: [], bonusPoints: [] },
  },
];

describe('mergeAndRankResults', () => {
  it('merges per-keyword results, dedupes by id, sorts by matchPercentage desc', () => {
    const results = [
      { success: true, jobs: [sampleJobs[0], sampleJobs[1]] },
      { success: true, jobs: [sampleJobs[1], sampleJobs[2]] }, // duplicate jobkorea_2
    ];
    const merged = mergeAndRankResults(results);
    assert.equal(merged.length, 3, 'should dedupe the duplicated job by id');
    assert.deepEqual(
      merged.map((j) => j.id),
      ['wanted_1', 'jobkorea_2', 'saramin_3'],
      'sorted by matchPercentage descending'
    );
  });

  it('ignores failed/empty search results without throwing', () => {
    const results = [
      { success: false, error: 'API 500' },
      { success: true, jobs: [] },
      undefined,
      { success: true, jobs: [sampleJobs[0]] },
    ];
    const merged = mergeAndRankResults(results);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, 'wanted_1');
  });
});

describe('buildRankedReport', () => {
  it('filters to worth-applying jobs at/above minScore and tags tiers', () => {
    const report = buildRankedReport(sampleJobs, { minScore: 60, keywords: ['DevSecOps', 'SRE'] });
    assert.equal(report.totalScored, 3);
    assert.equal(report.worthApplying.length, 2, 'only >=60 are worth applying');
    assert.deepEqual(
      report.worthApplying.map((j) => j.id),
      ['wanted_1', 'jobkorea_2']
    );
    // tier classification per <60 skip / 60-74 review / >=75 auto
    assert.equal(report.worthApplying[0].tier, 'auto');
    assert.equal(report.worthApplying[1].tier, 'review');
    assert.deepEqual(report.keywords, ['DevSecOps', 'SRE']);
    assert.ok(report.generatedAt, 'has timestamp');
  });

  it('returns empty worthApplying when nothing meets the threshold', () => {
    const report = buildRankedReport([sampleJobs[2]], { minScore: 60, keywords: ['x'] });
    assert.equal(report.worthApplying.length, 0);
    assert.equal(report.totalScored, 1);
  });

  it('respects maxResults cap on worthApplying', () => {
    const report = buildRankedReport(sampleJobs, { minScore: 60, maxResults: 1, keywords: [] });
    assert.equal(report.worthApplying.length, 1);
    assert.equal(report.worthApplying[0].id, 'wanted_1');
  });

  it('tags 50-59 as borderline tier', () => {
    const job = {
      id: 'b1',
      position: 'p',
      company: 'c',
      matchPercentage: 55,
      matchScore: 0,
      matchDetails: {},
    };
    const report = buildRankedReport([job], { minScore: 50, keywords: [] });
    assert.equal(report.worthApplying.length, 1);
    assert.equal(report.worthApplying[0].tier, 'borderline');
  });
});

describe('mergeDetailIntoJob', () => {
  it('fills empty description/requirements/techStack from detail payload', () => {
    const job = {
      id: 'wanted_9',
      position: 'SRE',
      description: '',
      requirements: '',
      techStack: [],
    };
    const detail = {
      success: true,
      job: {
        description: 'Operate Kubernetes clusters and CI/CD',
        requirements: '5+ years AWS, Terraform, observability',
        techStack: ['AWS', 'Terraform'],
      },
    };
    const merged = mergeDetailIntoJob(job, detail);
    assert.match(merged.description, /Kubernetes/);
    assert.match(merged.requirements, /Terraform/);
    assert.deepEqual(merged.techStack, ['AWS', 'Terraform']);
  });

  it('keeps original job unchanged when detail failed', () => {
    const job = {
      id: 'wanted_9',
      position: 'SRE',
      description: 'orig',
      requirements: '',
      techStack: [],
    };
    const merged = mergeDetailIntoJob(job, { success: false, error: 'x' });
    assert.equal(merged.description, 'orig');
  });

  it('does not overwrite already-populated fields', () => {
    const job = { id: 'j', description: 'keep', requirements: 'keepreq', techStack: ['X'] };
    const merged = mergeDetailIntoJob(job, {
      job: { description: 'new', requirements: 'newreq', techStack: ['Y'] },
    });
    assert.equal(merged.description, 'keep');
    assert.equal(merged.requirements, 'keepreq');
    assert.deepEqual(merged.techStack, ['X']);
  });
});

describe('rescoreJobs', () => {
  it('recomputes matchPercentage using injected matcher and re-sorts', () => {
    const jobs = [
      { id: 'a', position: 'p', matchPercentage: 10 },
      { id: 'b', position: 'q', matchPercentage: 90 },
    ];
    const fakeMatcher = {
      filterAndRankJobs(input) {
        return {
          jobs: input.map((j) => ({
            ...j,
            matchPercentage: j.id === 'a' ? 88 : 40,
            matchScore: 0,
            matchDetails: {},
          })),
          resumeAnalysis: {},
        };
      },
      prioritizeApplications: (j) => j,
    };
    const out = rescoreJobs(jobs, { matcher: fakeMatcher, resumePath: '/x' });
    assert.equal(out[0].id, 'a');
    assert.equal(out[0].matchPercentage, 88);
    assert.equal(out[1].matchPercentage, 40);
  });
});

describe('parsePositiveInt', () => {
  it('returns fallback for NaN, negative, zero-or-missing', () => {
    assert.equal(parsePositiveInt(undefined, 20), 20);
    assert.equal(parsePositiveInt('abc', 20), 20);
    assert.equal(parsePositiveInt('-5', 20), 20);
    assert.equal(parsePositiveInt('0', 20), 20);
    assert.equal(parsePositiveInt('30', 20), 30);
    assert.equal(parsePositiveInt(15, 20), 15);
  });
});

describe('enrichTopJobs', () => {
  function fakeCrawler(map) {
    return {
      async getJobDetail(id) {
        return map[id];
      },
    };
  }

  it('tags enrichmentStatus per job and records per-source stats', async () => {
    const jobs = [
      { id: 'wanted_1', source: 'wanted', description: '', requirements: '' },
      { id: 'jobkorea_2', source: 'jobkorea', description: '', requirements: '' },
      { id: 'wanted_3', source: 'wanted', description: 'already here', requirements: '' },
    ];
    const crawler = fakeCrawler({
      wanted_1: { success: true, job: { description: 'Operate k8s', requirements: 'AWS' } },
      jobkorea_2: { success: true, job: { description: '', requirements: '' } },
    });
    const { jobs: out, stats } = await enrichTopJobs(crawler, jobs);
    assert.equal(out[0].enrichmentStatus, 'success');
    assert.equal(out[1].enrichmentStatus, 'empty');
    assert.equal(out[2].enrichmentStatus, 'skipped');
    assert.equal(stats.wanted.success, 1);
    assert.equal(stats.wanted.skipped, 1);
    assert.equal(stats.jobkorea.empty, 1);
  });

  it('records failed status and error without throwing', async () => {
    const jobs = [{ id: 'wanted_x', source: 'wanted', description: '', requirements: '' }];
    const crawler = {
      async getJobDetail() {
        throw new Error('boom');
      },
    };
    const { jobs: out, stats } = await enrichTopJobs(crawler, jobs);
    assert.equal(out[0].enrichmentStatus, 'failed');
    assert.match(out[0].enrichmentError, /boom/);
    assert.equal(stats.wanted.failed, 1);
  });
});

describe('buildRankedReport enrichmentStats', () => {
  it('passes through enrichmentStats when provided', () => {
    const stats = { wanted: { success: 2, empty: 0, failed: 0, skipped: 1 } };
    const report = buildRankedReport([], { minScore: 60, keywords: [], enrichmentStats: stats });
    assert.deepEqual(report.enrichmentStats, stats);
  });
});

describe('buildRankedReport per-job enrichmentStatus', () => {
  it('carries enrichmentStatus and enrichmentError into worthApplying items', () => {
    const jobs = [
      {
        id: 'a',
        position: 'p',
        company: 'c',
        matchPercentage: 80,
        matchScore: 0,
        matchDetails: {},
        enrichmentStatus: 'success',
      },
      {
        id: 'b',
        position: 'q',
        company: 'd',
        matchPercentage: 64,
        matchScore: 0,
        matchDetails: {},
        enrichmentStatus: 'failed',
        enrichmentError: 'boom',
      },
    ];
    const report = buildRankedReport(jobs, { minScore: 60, keywords: [] });
    assert.equal(report.worthApplying[0].enrichmentStatus, 'success');
    assert.equal(report.worthApplying[1].enrichmentStatus, 'failed');
    assert.equal(report.worthApplying[1].enrichmentError, 'boom');
  });

  it('defaults jobs with no enrichmentStatus to not_attempted (outside enrich slice)', () => {
    const job = {
      id: 'c',
      position: 'p',
      company: 'c',
      matchPercentage: 70,
      matchScore: 0,
      matchDetails: {},
    };
    const report = buildRankedReport([job], { minScore: 60, keywords: [] });
    assert.equal(report.worthApplying[0].enrichmentStatus, 'not_attempted');
  });
});

describe('buildSubmitQueue', () => {
  const candidates = [
    {
      id: 'w1',
      source: 'wanted',
      position: 'Sec Eng',
      company: 'A',
      location: '서울',
      sourceUrl: 'https://w/1',
      matchPercentage: 80,
      tier: 'auto',
    },
    {
      id: 'j2',
      source: 'jobkorea',
      position: 'SRE',
      company: 'B',
      location: '서울',
      sourceUrl: 'https://j/2',
      matchPercentage: 64,
      tier: 'review',
    },
    {
      id: 'w3',
      source: 'wanted',
      position: 'Cloud',
      company: 'C',
      location: '서울',
      sourceUrl: 'https://w/3',
      matchPercentage: 78,
      tier: 'auto',
    },
  ];

  it('includes only auto-tier candidates by default, in queue shape', () => {
    const queue = buildSubmitQueue(candidates);
    assert.equal(queue.length, 2);
    assert.deepEqual(
      queue.map((q) => q.url),
      ['https://w/1', 'https://w/3']
    );
    const e = queue[0];
    assert.equal(e.company, 'A');
    assert.equal(e.position, 'Sec Eng');
    assert.equal(e.source, 'wanted');
    assert.equal(e.url, 'https://w/1');
    assert.equal(e.loginPlatform, 'wanted');
    assert.ok(e.status, 'has a status field for the queue consumer');
  });

  it('can include review tier when tiers option widens selection', () => {
    const queue = buildSubmitQueue(candidates, { tiers: ['auto', 'review'] });
    assert.equal(queue.length, 3);
  });

  it('returns empty array when no candidate matches tiers', () => {
    const queue = buildSubmitQueue([candidates[1]], { tiers: ['auto'] });
    assert.equal(queue.length, 0);
  });
});
