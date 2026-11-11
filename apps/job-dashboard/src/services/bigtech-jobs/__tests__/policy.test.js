import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPractitioner, toPosting } from '../common.js';

describe('operations practitioner targeting', () => {
  for (const title of [
    'Network Engineer',
    'IT Operations Engineer',
    'Systems Administrator',
    'Data Center Operation Engineer, DCO',
    '보안 솔루션 운영 엔지니어',
    'Security Infrastructure Engineer',
    'Security Solutions Engineer',
    'Senior Security Operations & Incident Response Engineer (SOC/CSIRT)',
    '시스템 운영 담당',
    '서버 운영 엔지니어',
    '[SNOW] IT 보안 기술 담당',
  ]) {
    it(`accepts ${title}`, () => assert.equal(isPractitioner(title), true));
  }
  for (const title of [
    'SRE Engineer',
    'Site Reliability Engineer',
    'DevOps Engineer',
    'DevSecOps Engineer',
    'Senior Cloud Security Engineer',
    '[SNOW] 클라우드 보안 담당',
    'Privacy Engineer',
    '개인정보보호 담당',
    'Linux System Software Engineer',
    'AI Platform 추론 최적화 Engineer(경력)',
    'Security Policy Analyst',
    'Network Team Lead',
    'Security Manager',
    'IT Operations Intern',
    'Data Center Security Specialist',
    'Physical Security Engineer',
    'Software Engineer, Backend - 인프라 (공통 서비스 개발, 콘텐츠 서빙)',
    'Software Engineer, Backend - 피드 (피드 인프라)',
    'Software Engineer, Frontend - 인프라',
    'Backend Developer - Infrastructure',
  ]) {
    it(`excludes ${title}`, () => assert.equal(isPractitioner(title), false));
  }
  it('only emits the PublicPosting fields, retaining pay before any summarization', () => {
    const posting = toPosting(
      'amazon',
      {
        id: '1',
        url: 'https://www.amazon.jobs/en/jobs/1/network-engineer',
        title: 'Network Engineer',
        company: 'AWS',
        location: 'KR, Seoul',
        description: '<p>Network operations</p><p>Base pay: USD $100 per hour</p>',
        arbitrarySourceField: 'must not leak',
      },
      '2026-11-11'
    );
    assert.deepEqual(Object.keys(posting).sort(), [
      'career',
      'company',
      'deadline',
      'description',
      'id',
      'location',
      'salary',
      'score',
      'source',
      'terms',
      'title',
      'url',
    ]);
    assert.equal(posting.salary, 'Base pay: USD $100 per hour');
  });
  it('retains structured-only pay in both salary and the persisted description', () => {
    const posting = toPosting(
      'daangn',
      {
        id: '1',
        url: 'https://careers.daangn.com/jobs/role/1/',
        title: 'Network Engineer',
        company: '당근',
        location: 'KR',
        description: '<p>네트워크 운영</p>',
        baseSalary: {
          currency: 'KRW',
          value: { minValue: 5000000, maxValue: 6000000, unitText: 'MONTH' },
        },
      },
      '2026-11-11'
    );
    assert.equal(posting.salary, 'KRW 5000000 - 6000000 / MONTH');
    assert.match(posting.description, /네트워크 운영/);
    assert.ok(posting.description.includes(posting.salary));
    assert.doesNotMatch(posting.description, /YEAR/);
  });
});
