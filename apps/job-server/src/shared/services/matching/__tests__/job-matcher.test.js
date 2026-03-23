import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

const JOB_MATCHER_URL = new URL('../job-matcher.js', import.meta.url);

async function importJobMatcherFresh() {
  const stamp = `${Date.now()}-${Math.random()}`;
  return import(`${JOB_MATCHER_URL.href}?v=${stamp}`);
}

describe('job-matcher', { concurrency: 1 }, () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
    syncBuiltinESMExports();
  });

  it('loadResume reads provided path and uses default path', async () => {
    mock.method(fs, 'existsSync', () => true);
    mock.method(fs, 'readFileSync', (path) => `resume:${path}`);
    syncBuiltinESMExports();

    const jm = await importJobMatcherFresh();

    const explicit = jm.loadResume('/tmp/resume.md');
    const implicit = jm.loadResume();

    assert.match(explicit, /^resume:\/tmp\/resume\.md$/);
    assert.match(implicit, /^resume:/);
    assert.strictEqual(fs.readFileSync.mock.calls.length, 2);
  });

  it('loadResume throws when file does not exist', async () => {
    mock.method(fs, 'existsSync', () => false);
    syncBuiltinESMExports();

    const jm = await importJobMatcherFresh();

    assert.throws(() => jm.loadResume('/missing.md'), /Resume not found/);
  });

  it('extractSkills returns category matches and empty map for no matches', async () => {
    const jm = await importJobMatcherFresh();
    const text = '보안 firewall fortigate linux aws kubernetes devops 자동화 python 금융 ai ml';
    const skills = jm.extractSkills(text);
    const empty = jm.extractSkills('irrelevant text only');

    assert.ok(skills.has('security'));
    assert.ok(skills.has('infrastructure'));
    assert.ok(skills.has('devops'));
    assert.ok(skills.has('automation'));
    assert.ok(skills.has('finance'));
    assert.ok(skills.has('ai_ml'));
    assert.strictEqual(empty.size, 0);
  });

  it('extractExperience supports Korean, English, and default formats', async () => {
    const jm = await importJobMatcherFresh();

    assert.strictEqual(jm.extractExperience('총 경력: 5년 6개월'), 5.5);
    assert.strictEqual(jm.extractExperience('총 경력: 4년 개월'), 4);
    assert.strictEqual(jm.extractExperience('3+ years of experience in backend systems'), 3);
    assert.strictEqual(jm.extractExperience('no explicit years here'), 8);
  });

  it('calculateMatchScore computes full score with all bonus branches', async () => {
    const jm = await importJobMatcherFresh();
    const resumeSkills = jm.extractSkills('보안 firewall aws kubernetes devops automation 금융 ai');
    const result = jm.calculateMatchScore(
      {
        position: 'DevOps Security Engineer',
        description: '금융 fintech automation ai security aws kubernetes',
        requirements: 'firewall devops',
        techStack: 'aws,k8s',
        experienceMin: 3,
        experienceMax: 6,
        location: 'Seoul',
        company: 'Naver Labs',
      },
      resumeSkills,
      5
    );

    assert.ok(result.score > 0);
    assert.ok(result.maxScore > 0);
    assert.ok(result.percentage > 0);
    assert.strictEqual(result.details.experienceMatch, true);
    assert.strictEqual(result.details.locationMatch, true);
    assert.ok(result.details.bonusPoints.includes('금융권 경험 매칭'));
    assert.ok(result.details.bonusPoints.includes('AI/자동화 경험 매칭'));
    assert.ok(result.details.bonusPoints.includes('주요 기업'));
  });

  it('calculateMatchScore covers partial and no experience branches', async () => {
    const jm = await importJobMatcherFresh();
    const resumeSkills = jm.extractSkills('security');

    const partial = jm.calculateMatchScore(
      {
        position: 'Security Engineer',
        description: 'security role',
        experienceMin: 10,
        experienceMax: 11,
        location: 'Busan',
        company: 'Local Co',
      },
      resumeSkills,
      9
    );

    const none = jm.calculateMatchScore(
      {
        position: 'Security Engineer',
        description: 'security role',
        experienceMin: 10,
        experienceMax: 11,
        location: 'Busan',
        company: 'Local Co',
      },
      resumeSkills,
      5
    );

    assert.strictEqual(partial.details.experienceMatch, false);
    assert.ok(partial.score > none.score);

    const annualRange = jm.calculateMatchScore(
      {
        position: null,
        description: null,
        requirements: null,
        techStack: null,
        annual_from: 7,
        annual_to: 9,
        location: undefined,
        company: undefined,
      },
      new Map(),
      8
    );

    assert.strictEqual(annualRange.details.locationMatch, false);
    assert.strictEqual(annualRange.details.experienceMatch, true);

    const noExp = jm.calculateMatchScore(
      {
        position: 'Engineer',
        description: 'role',
      },
      new Map(),
      5
    );
    assert.strictEqual(noExp.details.experienceMatch, true);
  });

  it('filterAndRankJobs ranks, filters, excludes, and returns resume analysis', async () => {
    const resumeText = '총 경력: 8년 0개월 보안 security aws kubernetes devops 자동화 금융 ai';
    mock.method(fs, 'existsSync', () => true);
    mock.method(fs, 'readFileSync', () => resumeText);
    syncBuiltinESMExports();

    const jm = await importJobMatcherFresh();
    const jobs = [
      {
        company: 'BadCorp Security',
        position: 'Security Engineer',
        description: 'security aws',
        experienceMin: 3,
        experienceMax: 10,
        location: '서울',
      },
      {
        company: 'Toss',
        position: 'DevOps Engineer',
        description: '금융 fintech automation ai aws kubernetes',
        experienceMin: 3,
        experienceMax: 9,
        location: 'Seoul',
      },
      {
        company: 'Plain Co',
        position: 'Infra Engineer',
        description: 'linux server',
        experienceMin: 1,
        experienceMax: 3,
        location: 'Daegu',
      },
      {
        position: 'No Company Job',
        description: 'ops role',
        experienceMin: 1,
        experienceMax: 3,
      },
    ];

    const result = jm.filterAndRankJobs(jobs, {
      resumePath: '/tmp/resume.md',
      minScore: 10,
      maxResults: 1,
      excludeCompanies: ['badcorp'],
    });

    assert.strictEqual(result.jobs.length, 1);
    assert.strictEqual(result.jobs[0].company, 'Toss');
    assert.ok(result.resumeAnalysis.experience >= 8);
    assert.ok(Array.isArray(result.resumeAnalysis.skillCategories));
    assert.ok(result.resumeAnalysis.totalSkills > 0);
  });

  it('prioritizeApplications applies high/medium/low and due-date logic', async () => {
    const jm = await importJobMatcherFresh();
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const result = jm.prioritizeApplications([
      { company: 'A', matchPercentage: 86, matchDetails: { bonusPoints: [] } },
      { company: 'B', matchPercentage: 72, matchDetails: { bonusPoints: [] } },
      { company: 'C', matchPercentage: 50, due_date: soon, matchDetails: { bonusPoints: [] } },
      { company: 'D', matchPercentage: 50, matchDetails: { bonusPoints: ['주요 기업'] } },
    ]);

    assert.strictEqual(result[0].applicationPriority, 'high');
    assert.strictEqual(result[1].applicationPriority, 'medium');
    assert.strictEqual(result[2].applicationPriority, 'high');
    assert.strictEqual(result[3].applicationPriority, 'medium');
    assert.strictEqual(result[0].rank, 1);
    assert.ok(result[2].priorityReason.some((r) => r.includes('마감')));
    assert.ok(result[3].priorityReason.includes('주요 기업'));
  });

  it('default export exposes the matcher functions', async () => {
    const jm = await importJobMatcherFresh();

    assert.strictEqual(jm.default.loadResume, jm.loadResume);
    assert.strictEqual(jm.default.extractSkills, jm.extractSkills);
    assert.strictEqual(jm.default.extractExperience, jm.extractExperience);
    assert.strictEqual(jm.default.calculateMatchScore, jm.calculateMatchScore);
    assert.strictEqual(jm.default.filterAndRankJobs, jm.filterAndRankJobs);
    assert.strictEqual(jm.default.prioritizeApplications, jm.prioritizeApplications);
  });
});
