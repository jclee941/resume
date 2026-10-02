import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SK_CAREER_LIMIT, mapToSkCareersResume } from '../index.js';

const ssot = {
  careers: [
    { company: '(주)에프', period: '2026.06 ~ 현재', role: 'SRE', description: ' 운영 ' },
    { company: '(주)에이', period: '2025.03 ~ 2026.02', role: 'DevOps', description: '배포' },
    { company: '비', period: '2024.03 ~ 2025.02', role: 'SRE' },
    { company: '씨', period: '2022.08 ~ 2024.03', role: 'SRE' },
    { company: '디', period: '2021.09 ~ 2022.04', role: 'SRE' },
    { company: '이', period: '2020.08 ~ 2021.08', role: 'SRE' },
  ],
  certifications: [
    { name: 'CKAD', issuer: 'CNCF', date: '2019.02', status: 'active' },
    { name: 'CISSP', issuer: 'ISC2', date: null, status: '준비중' },
    { name: 'CKA', issuer: 'CNCF', date: '2024-05', status: 'active' },
  ],
  education: {
    school: '예시사이버대학교',
    major: '컴퓨터공학과',
    startDate: '2023.03',
    endDate: '2026.08',
    status: '졸업 예정',
    highSchool: '어느고등학교',
    highSchoolGraduation: '2012',
  },
  military: { status: '사회복무요원 소집해제', period: '2015.03 ~ 2017.01' },
};

describe('mapToSkCareersResume', () => {
  const ids = ['hs-id', 'univ-id'];
  const sections = mapToSkCareersResume(ssot, { newId: () => ids.shift() ?? 'extra-id' });

  it('keeps the most recent careers up to the site limit, one array per field', () => {
    const { careers } = sections;

    assert.equal(careers.carCorpName.length, SK_CAREER_LIMIT);
    assert.deepEqual(careers.carCorpName, ['(주)에프', '(주)에이', '비', '씨', '디']);
    assert.deepEqual(careers.carSeq, ['0', '0', '0', '0', '0']);
    assert.equal(careers.carWorkingYN[0], '1');
    assert.equal(careers.carToDate[0], '');
    assert.equal(careers.carFromDate[0], '2026-06');
    assert.equal(careers.carDescription[0], '운영');
    assert.deepEqual(
      [careers.carWorkingYN[1], careers.carFromDate[1], careers.carToDate[1]],
      ['0', '2025-03', '2026-02']
    );
  });

  it('lists active certificates only, newest first', () => {
    assert.deepEqual(sections.certificates.cerCertName, ['CKA', 'CKAD']);
    assert.deepEqual(sections.certificates.cerCertDate, ['2024-05', '2019-02']);
    assert.deepEqual(sections.certificates.cerCertSource, ['CNCF', 'CNCF']);
  });

  it('maps the university and the high school to the site codes', () => {
    assert.deepEqual(sections.education, {
      eduhgSeq: '0',
      eduhgRandom: 'hs-id',
      eduhgRequired: '0',
      eduhgEducationType: '308001',
      eduhgEducationStatus: '309003',
      eduhgQualificationExamYN: '0',
      eduhgEducationName: '어느고등학교',
      eduhgToDate: '2012-02',
      eduSeq: '0',
      eduUnivRandom: 'univ-id',
      eduUnivRequired: '0',
      eduEducationType: '308003',
      eduEducationStatus: '309002',
      eduEducationName: '예시사이버대학교',
      eduEducationRegion: '',
      eduDaytimeYN: '',
      eduMajorFamily: '107021',
      eduMajor: '컴퓨터공학과',
      eduFromDate: '2023-03',
      eduToDate: '2026-08',
    });
  });

  it('maps completed public service to served, type public service', () => {
    assert.deepEqual(sections.personal, {
      prsMilitarySvcYN: '1',
      prsMilitarySvcStatus: '302001',
      prsMilitarySvcType: '303003',
      prsMilitarySvcFromDate: '2015-03',
      prsMilitarySvcToDate: '2017-01',
    });
  });

  it('posts a single item as plain strings and leaves out empty sections', () => {
    const single = mapToSkCareersResume({
      careers: [{ company: 'A', period: '2025.03 ~ 2026.02', role: 'SRE' }],
    });

    assert.equal(single.careers.carCorpName, 'A');
    assert.deepEqual(single.certificates, {});
    assert.deepEqual(single.education, {});
    assert.deepEqual(single.personal, {});
  });
});
