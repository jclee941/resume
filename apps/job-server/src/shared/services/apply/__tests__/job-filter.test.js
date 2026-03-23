import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register(new URL('./job-filter-loader.mjs', import.meta.url), import.meta.url);

const { JobFilter } = await import('../job-filter.js');

const baseJobs = [
  { company: 'Alpha', position: 'DevOps', source: 'wanted', matchScore: 40 },
  { company: 'Beta', position: 'Backend', source: 'saramin', matchScore: 60 },
];

describe('JobFilter AI scoring', () => {
  let aiMatcherMock;

  beforeEach(() => {
    aiMatcherMock = mock.fn(async () => ({ jobs: [], fallback: false }));
    globalThis.__jobFilterMatchJobsWithAI = aiMatcherMock;
  });

  it('uses hybrid scoring when AI returns matching jobs', async () => {
    aiMatcherMock.mock.mockImplementationOnce(async () => ({
      jobs: [
        { company: 'Alpha', position: 'DevOps', matchScore: 90 },
        { company: 'Beta', position: 'Backend', matchScore: 80 },
      ],
      fallback: false,
    }));

    const filter = new JobFilter({
      reviewThreshold: 0,
      autoApplyThreshold: 0,
      platformPriority: ['wanted', 'saramin'],
    });

    const result = await filter.filter(baseJobs, new Set(), {
      useAI: true,
      resumePath: '/fake/path',
    });

    assert.equal(aiMatcherMock.mock.calls.length, 1);
    assert.equal(aiMatcherMock.mock.calls[0].arguments[0], '/fake/path');
    assert.equal(aiMatcherMock.mock.calls[0].arguments[1].length, 2);
    assert.equal(aiMatcherMock.mock.calls[0].arguments[2].maxResults, 2);

    assert.ok(result.jobs.every((job) => job.matchType === 'hybrid'));

    const alpha = result.jobs.find((job) => job.company === 'Alpha');
    const beta = result.jobs.find((job) => job.company === 'Beta');

    assert.equal(alpha.aiScore, 90);
    assert.equal(alpha.heuristicScore, 44);
    assert.equal(alpha.matchScore, 76);

    assert.equal(beta.aiScore, 80);
    assert.equal(beta.heuristicScore, 62);
    assert.equal(beta.matchScore, 75);
  });

  it('falls back to heuristic when AI response has fallback=true', async () => {
    aiMatcherMock.mock.mockImplementationOnce(async () => ({
      jobs: [{ company: 'Alpha', position: 'DevOps', matchScore: 99 }],
      fallback: true,
    }));

    const filter = new JobFilter({
      reviewThreshold: 0,
      autoApplyThreshold: 0,
      platformPriority: ['wanted', 'saramin'],
    });

    const result = await filter.filter(baseJobs, new Set(), {
      useAI: true,
      resumePath: '/fake/path',
    });

    assert.ok(result.jobs.every((job) => job.matchType === 'heuristic'));
  });

  it('falls back to heuristic when AI returns no jobs', async () => {
    aiMatcherMock.mock.mockImplementationOnce(async () => ({
      jobs: [],
      fallback: false,
    }));

    const filter = new JobFilter({
      reviewThreshold: 0,
      autoApplyThreshold: 0,
      platformPriority: ['wanted', 'saramin'],
    });

    const result = await filter.filter(baseJobs, new Set(), {
      useAI: true,
      resumePath: '/fake/path',
    });

    assert.ok(result.jobs.every((job) => job.matchType === 'heuristic'));
  });

  it('falls back to heuristic and logs warning when AI scoring throws', async () => {
    const logger = {
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };

    aiMatcherMock.mock.mockImplementationOnce(async () => {
      throw new Error('AI crashed');
    });

    const filter = new JobFilter({
      logger,
      reviewThreshold: 0,
      autoApplyThreshold: 0,
      platformPriority: ['wanted', 'saramin'],
    });

    const result = await filter.filter(baseJobs, new Set(), {
      useAI: true,
      resumePath: '/fake/path',
    });

    assert.ok(result.jobs.every((job) => job.matchType === 'heuristic'));
    assert.equal(logger.warn.mock.calls.length, 1);
    assert.equal(
      logger.warn.mock.calls[0].arguments[0],
      'AI scoring failed, falling back to heuristic:'
    );
    assert.equal(logger.warn.mock.calls[0].arguments[1], 'AI crashed');
  });

  it('uses heuristic-only for AI score map lookup misses', async () => {
    aiMatcherMock.mock.mockImplementationOnce(async () => ({
      jobs: [{ company: 'Alpha', position: 'DevOps', matchScore: 90 }],
      fallback: false,
    }));

    const filter = new JobFilter({
      reviewThreshold: 0,
      autoApplyThreshold: 0,
      platformPriority: ['wanted', 'saramin'],
    });

    const result = await filter.filter(baseJobs, new Set(), {
      useAI: true,
      resumePath: '/fake/path',
    });

    const alpha = result.jobs.find((job) => job.company === 'Alpha');
    const beta = result.jobs.find((job) => job.company === 'Beta');

    assert.equal(alpha.matchType, 'hybrid');
    assert.equal(beta.matchType, 'heuristic');
    assert.equal(beta.matchScore, 62);
  });

  it('caps blended score at 100', async () => {
    aiMatcherMock.mock.mockImplementationOnce(async () => ({
      jobs: [{ company: 'CapCorp', position: 'Principal', matchScore: 150 }],
      fallback: false,
    }));

    const filter = new JobFilter({
      reviewThreshold: 0,
      autoApplyThreshold: 0,
      platformPriority: ['wanted', 'saramin'],
    });

    const result = await filter.filter(
      [{ company: 'CapCorp', position: 'Principal', source: 'none', matchScore: 100 }],
      new Set(),
      {
        useAI: true,
        resumePath: '/fake/path',
      }
    );

    assert.equal(result.jobs[0].matchType, 'hybrid');
    assert.equal(result.jobs[0].matchScore, 100);
  });

  it('returns matchType none when all jobs are filtered out', async () => {
    const filter = new JobFilter({
      excludeKeywords: ['intern'],
      reviewThreshold: 0,
      autoApplyThreshold: 0,
    });

    const result = await filter.filter([
      { company: 'A', position: 'Intern DevOps', source: 'wanted' },
    ]);

    assert.equal(result.jobs.length, 0);
    assert.equal(result.stats.matchType, 'none');
  });

  it('handles missing fields and uses heuristic defaults', async () => {
    const filter = new JobFilter({
      reviewThreshold: 0,
      autoApplyThreshold: 0,
      preferredCompanies: ['PreferredCorp'],
      keywords: ['sre'],
      platformPriority: ['wanted'],
    });

    const result = await filter.filter([
      {},
      { company: 'SRECorp', title: 'SRE Engineer', source: 'wanted' },
      { company: 'PreferredCorp', source: 'none' },
      { company: 'PreferredCorp', source: 'none' },
    ]);

    assert.equal(result.stats.afterDedup, 3);

    const empty = result.jobs.find((job) => !job.company && !job.title);
    const sre = result.jobs.find((job) => job.title === 'SRE Engineer');
    const preferred = result.jobs.find((job) => job.company === 'PreferredCorp');

    assert.equal(empty.matchScore, 50);
    assert.equal(sre.matchScore, 72);
    assert.equal(preferred.matchScore, 65);
  });
});
