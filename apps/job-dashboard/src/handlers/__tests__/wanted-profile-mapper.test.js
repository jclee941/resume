import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JOB_CATEGORY_MAPPING, DEFAULT_JOB_CATEGORY } from '@resume/shared/job-categories';
import {
  parsePeriod,
  mapCareerToWanted,
  mapEducationToWanted,
  mapCertificationToWanted,
  buildProfileData,
} from '../mappers/wanted-profile-mapper.js';

describe('wanted profile mappers', () => {
  it('parsePeriod maps ranged period', () => {
    assert.deepStrictEqual(parsePeriod('2024.01 ~ 2025.02'), {
      start: '2024-01-01',
      end: '2025-02-01',
    });
  });

  it('parsePeriod maps current role as served', () => {
    assert.deepStrictEqual(parsePeriod('2025.03 ~ 현재'), {
      start: '2025-03-01',
      end: null,
    });
  });

  it('mapCareerToWanted keeps mapping contract and category fallback', () => {
    const mappedKnown = mapCareerToWanted({
      company: 'ACME',
      role: '소프트웨어 엔지니어',
      period: '2024.01 ~ 2024.12',
    });
    assert.strictEqual(mappedKnown.job_category_id, JOB_CATEGORY_MAPPING['소프트웨어 엔지니어']);
    assert.strictEqual(mappedKnown.served, false);
    assert.strictEqual(mappedKnown.employment_type, 'FULLTIME');

    const mappedUnknown = mapCareerToWanted({
      company: 'ACME2',
      role: '알수없는역할',
      period: '2025.03 ~ 현재',
    });
    assert.strictEqual(mappedUnknown.job_category_id, DEFAULT_JOB_CATEGORY);
    assert.strictEqual(mappedUnknown.served, true);
    assert.strictEqual(mappedUnknown.end_time, null);
  });

  it('mapEducationToWanted handles 재학중 and 졸업 states', () => {
    const enrolled = mapEducationToWanted({
      school: '한양사이버대학교',
      major: '컴퓨터공학과',
      startDate: '2024.03',
      status: '재학중',
    });
    assert.strictEqual(enrolled.start_time, '2024-03-01');
    assert.strictEqual(enrolled.end_time, null);
    assert.strictEqual(enrolled.description, '재학중 (2024.03 ~ )');

    const graduated = mapEducationToWanted({
      school: '서울대학교',
      major: 'CS',
      startDate: '2014.03',
      endDate: '2018.02',
      status: '졸업',
    });
    assert.strictEqual(graduated.end_time, '2018-02-01');
    assert.strictEqual(graduated.description, null);
  });

  it('mapCertificationToWanted maps certificate activity payload', () => {
    const mapped = mapCertificationToWanted({
      name: 'CPPG',
      issuer: 'KISA',
      date: '2024.11',
    });
    assert.deepStrictEqual(mapped, {
      title: 'CPPG',
      description: 'KISA | 2024.11',
      start_time: '2024-11-01',
      activity_type: 'CERTIFICATE',
    });
  });

  it('buildProfileData builds wanted profile payload from ssot', () => {
    const payload = buildProfileData({
      personal: { name: 'Jaecheol', email: 'qws941@example.com', phone: '010-1234-5678' },
      current: { position: 'Security Engineer' },
      summary: {
        totalExperience: '5년+',
        expertise: ['Cloud', 'Security', 'Automation'],
        profileStatement: 'Automation-first security engineer',
      },
    });
    assert.deepStrictEqual(payload, {
      name: 'Jaecheol',
      email: 'qws941@example.com',
      phone: '010-1234-5678',
      headline: 'Security Engineer | 5년+',
      skills: 'Cloud,Security,Automation',
      summary: 'Automation-first security engineer',
    });
  });
});
