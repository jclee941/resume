import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapToSkCareersResume, mergeSkCareersResume } from '../index.js';

const ssot = {
  careers: [
    { company: 'A', period: '2025.03 ~ 2026.02', role: 'SRE', description: 'ops' },
    { company: 'B', period: '2024.03 ~ 2025.02', role: 'SRE', description: 'dev' },
  ],
  certifications: [{ name: 'CKA', issuer: 'CNCF', date: '2024-05', status: 'active' }],
  education: {
    school: 'U',
    major: '컴퓨터공학과',
    startDate: '2023.03',
    endDate: '2026.08',
    status: '졸업 예정',
  },
  military: { status: '사회복무요원', period: '2015.03 ~ 2017.01' },
};
const sections = mapToSkCareersResume(ssot, { newId: () => 'new-id' });

const emptyEditor = {
  prsApplicantName: 'Me',
  prsPhone: '010',
  OriPhone: '010',
  prsResidenceNation: ['', ''],
  prsMilitarySvcYN: '0',
  prsMilitarySvcStatus: '',
  prsMilitarySvcType: '',
  prsMilitarySvcFromDate: '',
  prsMilitarySvcToDate: '',
  resumeSeq: '0',
  resumeApplyFormSeq: '1',
};

describe('mergeSkCareersResume', () => {
  it('fills an empty editor, placing new sections before the attachments', () => {
    const { form, changes } = mergeSkCareersResume(emptyEditor, sections);
    const keys = Object.keys(form);

    assert.equal(form.prsApplicantName, 'Me');
    assert.equal(form.prsPhone, form.OriPhone);
    assert.equal(form.prsMilitarySvcStatus, '302001');
    assert.equal(form.prsResidenceNation, '');
    assert.deepEqual(form.carCorpName, ['A', 'B']);
    assert.equal(form.cerCertName, 'CKA');
    assert.ok(keys.indexOf('eduEducationName') < keys.indexOf('carSeq'));
    assert.ok(keys.indexOf('carRetireDesc') < keys.indexOf('cerSeq'));
    assert.ok(keys.indexOf('cerCertFileName') < keys.indexOf('resumeSeq'));
    assert.deepEqual(changes, { personal: 5, education: 12, careers: 2, certificates: 1 });
  });

  it('reports no changes for a saved resume that already matches, keeping its item keys', () => {
    const { form: firstSave } = mergeSkCareersResume(emptyEditor, sections);
    const saved = {
      ...firstSave,
      prsResidenceNation: ['', ''],
      eduUnivRandom: 'saved-id',
      'eduUnivGrade_saved-id': ['G1', 'G2'],
    };

    const { form, changes } = mergeSkCareersResume(saved, sections);

    assert.deepEqual(changes, {});
    assert.equal(form.eduUnivRandom, 'saved-id');
    assert.deepEqual(form['eduUnivGrade_saved-id'], ['G1', 'G2']);
  });

  it('replaces a saved list where it stands and drops items the SSoT no longer has', () => {
    const { resumeSeq, resumeApplyFormSeq, ...personal } = emptyEditor;
    const saved = {
      ...personal,
      carSeq: ['0', '0', '0'],
      carCorpName: ['Old1', 'Old2', 'Old3'],
      cerSeq: '0',
      cerCertName: 'Old cert',
      resumeSeq,
      resumeApplyFormSeq,
    };
    const withoutCerts = mapToSkCareersResume({ careers: ssot.careers });

    const { form, changes } = mergeSkCareersResume(saved, withoutCerts);
    const keys = Object.keys(form);

    assert.deepEqual(form.carCorpName, ['A', 'B']);
    assert.deepEqual(
      keys.slice(keys.indexOf('carSeq'), keys.indexOf('resumeSeq')),
      Object.keys(withoutCerts.careers)
    );
    assert.equal('cerCertName' in form, false);
    assert.deepEqual(changes, { careers: 2, certificates: 0 });
  });

  it('cleans a country value the site stored joined by a full-width comma', () => {
    const { form: firstSave } = mergeSkCareersResume(emptyEditor, sections);

    const { form, changes } = mergeSkCareersResume(
      { ...firstSave, prsResidenceNation: ['，', ''] },
      sections
    );

    assert.equal(form.prsResidenceNation, '');
    assert.deepEqual(changes, { joinedValues: 1 });
  });
});

describe('mergeSkCareersResume saved-only fields', () => {
  const careerSsot = (names) => ({
    careers: names.map((company, i) => ({
      company,
      period: `202${i}.03 ~ 202${i}.12`,
      role: 'SRE',
      description: 'd',
    })),
  });
  const savedWith = (extra) => ({ ...emptyEditor, ...extra });

  it('keeps saved department, rank, salary for a reordered career matched by identity', () => {
    const mapped = mapToSkCareersResume(careerSsot(['A', 'B']));
    const saved = savedWith({
      carSeq: ['5', '6'],
      carCorpName: ['B', 'A'],
      carFromDate: ['2021-03', '2020-03'],
      carToDate: ['2021-12', '2020-12'],
      carJobRole: ['SRE', 'SRE'],
      carDeptName: ['DeptB', 'DeptA'],
      carPosition: ['PosB', 'PosA'],
      carSalary: ['2', '1'],
      carRetireDesc: ['rb', 'ra'],
      carDescription: ['d', 'd'],
      carWorkingYN: ['0', '0'],
    });

    const { form } = mergeSkCareersResume(saved, mapped);

    assert.deepEqual(form.carCorpName, ['A', 'B']);
    assert.deepEqual(form.carDeptName, ['DeptA', 'DeptB']);
    assert.deepEqual(form.carPosition, ['PosA', 'PosB']);
    assert.deepEqual(form.carSalary, ['1', '2']);
  });

  it('pairs duplicate company names one-to-one and still erases SSoT-blanked mapped fields', () => {
    const mapped = mapToSkCareersResume({
      careers: [
        { company: 'A', period: '2020.03 ~ 2020.12', role: 'X', description: '' },
        { company: 'A', period: '2020.03 ~ 2020.12', role: 'X', description: '' },
      ],
    });
    const saved = savedWith({
      carCorpName: ['A', 'A'],
      carFromDate: ['2020-03', '2020-03'],
      carDeptName: ['first', 'second'],
      carDescription: ['old1', 'old2'],
    });

    const { form } = mergeSkCareersResume(saved, mapped);

    assert.deepEqual(form.carDeptName, ['first', 'second']);
    assert.deepEqual(form.carDescription, ['', '']);
  });

  it('drops saved extras of removed careers and of unmatched new ones', () => {
    const mapped = mapToSkCareersResume(careerSsot(['New']));
    const saved = savedWith({ carCorpName: 'Gone', carFromDate: '2020-03', carDeptName: 'Dept' });

    const { form } = mergeSkCareersResume(saved, mapped);

    assert.equal(form.carCorpName, 'New');
    assert.equal(form.carDeptName, '');
  });

  it('keeps saved certificate number and file metadata, and is idempotent', () => {
    const mapped = mapToSkCareersResume(ssot, { newId: () => 'new-id' });
    const saved = savedWith({
      cerSeq: '9',
      cerCertName: 'CKA',
      cerCertSource: 'CNCF',
      cerCertDate: '2024-05',
      cerCertNumber: 'N-1',
      cerCertFilePath: '/f/p',
      cerCertFileText: 'txt',
      cerCertFileName: 'cka.pdf',
    });

    const first = mergeSkCareersResume(saved, mapped);
    const again = mergeSkCareersResume(first.form, mapped);

    assert.equal(first.form.cerCertNumber, 'N-1');
    assert.equal(first.form.cerCertFileName, 'cka.pdf');
    assert.equal(first.form.cerCertFilePath, '/f/p');
    assert.equal(again.changes.certificates, undefined);
    assert.deepEqual(again.form.cerCertNumber, 'N-1');
  });

  it('keeps saved education region and daytime flag when the SSoT has none', () => {
    const saved = savedWith({
      eduSeq: '3',
      eduUnivRandom: 'r',
      eduEducationName: 'U',
      eduEducationRegion: '서울',
      eduDaytimeYN: '1',
    });

    const { form } = mergeSkCareersResume(saved, sections);

    assert.equal(form.eduEducationRegion, '서울');
    assert.equal(form.eduDaytimeYN, '1');
  });
});
