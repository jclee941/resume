import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { JobFilter } from '../index.js';

describe('JobFilter basic filtering', () => {
  it('deduplicates jobs by company:position key', async () => {
    const filter = new JobFilter({ minMatchScore: 0, reviewThreshold: 0 });
    const jobs = [
      { company: 'Toss', position: 'DevOps', matchScore: 50 },
      { company: 'toss', position: 'devops', matchScore: 50 },
      { company: 'Kakao', position: 'Backend', matchScore: 50 },
    ];

    const result = await filter.filter(jobs);

    assert.equal(result.jobs.length, 2);
    assert.equal(result.stats.input, 3);
    assert.equal(result.stats.afterDedup, 2);
  });

  it('excludes keyword and company matches', async () => {
    const filter = new JobFilter({
      excludeKeywords: ['intern'],
      excludeCompanies: ['BadCorp'],
      minMatchScore: 0,
      reviewThreshold: 0,
    });
    const jobs = [
      { company: 'GoodCorp', position: 'Senior DevOps', matchScore: 50 },
      { company: 'BadCorp Inc', position: 'DevOps', matchScore: 50 },
      { company: 'Other', position: 'DevOps Intern', matchScore: 50 },
    ];

    const result = await filter.filter(jobs);

    assert.equal(result.jobs.length, 1);
    assert.equal(result.jobs[0].company, 'GoodCorp');
  });

  it('boosts preferred companies and filters below minMatchScore', async () => {
    const filter = new JobFilter({
      preferredCompanies: ['Toss'],
      minMatchScore: 70,
      reviewThreshold: 70,
    });
    const jobs = [
      { company: 'Toss', position: 'DevOps', matchScore: 70 },
      { company: 'Other', position: 'DevOps', matchScore: 50 },
    ];

    const result = await filter.filter(jobs);

    assert.equal(result.jobs.length, 1);
    assert.equal(result.jobs[0].company, 'Toss');
  });

  it('respects existing job IDs for deduplication', async () => {
    const filter = new JobFilter({ minMatchScore: 0, reviewThreshold: 0 });
    const jobs = [
      { company: 'A', position: 'DevOps', matchScore: 50 },
      { company: 'B', position: 'DevOps', matchScore: 50 },
    ];

    const result = await filter.filter(jobs, new Set(['a:devops']));

    assert.equal(result.jobs.length, 1);
    assert.equal(result.jobs[0].company, 'B');
  });
});
