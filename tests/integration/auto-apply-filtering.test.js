const { describe, test, expect, beforeAll, afterEach } = require('@jest/globals');
const { loadApplyModules } = require('./auto-apply-fixtures.js');

let JobFilter;

describe('Auto-Apply match filtering integration', () => {
  beforeAll(async () => {
    ({ JobFilter } = await loadApplyModules());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('< 60 score jobs are skipped', async () => {
    const result = await new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: [],
    }).filter([
      { jobId: '1', position: 'Cleaner', company: 'Company A', source: 'wanted', matchScore: 30 },
      { jobId: '2', position: 'Cashier', company: 'Company B', source: 'wanted', matchScore: 25 },
    ]);

    expect(result.jobs.length).toBe(0);
  });

  test('60-74 score jobs go to manual review', async () => {
    const result = await new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: [],
    }).filter([
      {
        jobId: '1',
        position: 'Junior Developer',
        company: 'Company A',
        source: 'wanted',
        matchScore: 65,
      },
      {
        jobId: '2',
        position: 'Medior Engineer',
        company: 'Company B',
        source: 'wanted',
        matchScore: 70,
      },
    ]);

    expect(result.jobs.length).toBe(2);
    expect(result.jobs.every((job) => job.tier === 'manual-review')).toBe(true);
  });

  test('75+ score jobs are auto-apply tier', async () => {
    const result = await new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: [],
    }).filter([
      { jobId: '1', position: 'Senior DevOps', company: 'Company A', source: 'wanted', matchScore: 80 },
      { jobId: '2', position: 'Principal Engineer', company: 'Company B', source: 'wanted', matchScore: 90 },
    ]);

    expect(result.jobs.length).toBe(2);
    expect(result.jobs.every((job) => job.tier === 'auto-apply')).toBe(true);
  });

  test('leadership security roles are skipped by default', async () => {
    const result = await new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: [],
    }).filter([
      {
        jobId: '1',
        position: '[공통] 정보보안 팀장 (Security Lead)',
        company: '고위드',
        source: 'greeting',
        matchScore: 95,
      },
      {
        jobId: '2',
        position: 'Lead Security Engineer',
        company: 'Company B',
        source: 'wanted',
        matchScore: 90,
      },
      {
        jobId: '3',
        position: 'Security Manager',
        company: 'Company C',
        source: 'wanted',
        matchScore: 90,
      },
      {
        jobId: '4',
        position: '정보보안 담당자',
        company: 'Company D',
        source: 'wanted',
        matchScore: 90,
      },
    ]);

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].position).toBe('정보보안 담당자');
  });

  test('keyword matching raises the relevant job above review threshold', async () => {
    const result = await new JobFilter({
      keywords: ['DevOps'],
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: [],
    }).filter([
      { jobId: '1', position: 'DevOps Engineer', company: 'Company A', source: 'wanted' },
      { jobId: '2', position: 'Backend Developer', company: 'Company B', source: 'wanted' },
    ]);

    expect(result.jobs.length).toBe(1);
    expect(result.jobs[0].position).toBe('DevOps Engineer');
    expect(result.jobs[0].tier).toBe('manual-review');
  });

  test('platform priority alone does not bypass the review threshold', async () => {
    const mockJobs = [{ jobId: '1', position: 'Engineer', company: 'Company A', source: 'wanted' }];
    const resultWithPriority = await new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: ['wanted', 'saramin', 'jobkorea'],
    }).filter(mockJobs);
    const resultWithoutPriority = await new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: [],
    }).filter(mockJobs);

    expect(resultWithPriority.jobs.length).toBe(0);
    expect(resultWithoutPriority.jobs.length).toBe(0);
  });
});
