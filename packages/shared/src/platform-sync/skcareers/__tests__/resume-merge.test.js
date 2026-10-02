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
