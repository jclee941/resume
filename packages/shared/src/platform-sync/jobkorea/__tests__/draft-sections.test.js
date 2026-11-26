import assert from 'node:assert/strict';
import { it } from 'node:test';
import { planJobKoreaSections } from '../index.js';

it('retains matched row IDs, section siblings and school-specific extras', () => {
  const content = {
    general: { title: 'fixture', certificateDescription: 'keep' },
    careers: [
      { entryId: 'career-row', companyName: 'Test', startedOn: '2025-03', positionTitle: 'keep' },
    ],
    certificates: [
      {
        entryId: 'cert-row',
        certificate: { code: 'C', name: 'test', selectionType: 'CODE' },
        naverLinked: true,
      },
    ],
    awards: [{ entryId: 'award-row', name: 'award', description: 'keep' }],
    languages: [{ entryId: 'language-row' }],
    languageTests: [{ entryId: 'language-test-row' }],
    trainings: [{ entryId: 'training-row' }],
    educationSummary: { belowHighSchool: false },
    educations: [
      {
        entryId: 'edu-row',
        schoolType: 'GRADUATE',
        school: { name: 'School', selectionType: 'CUSTOM' },
        researchTopic: 'keep',
        degreeProgramType: 'keep',
        majors: [],
      },
    ],
    selfIntroductions: [
      { entryId: 'intro-1', title: 'fixture' },
      { entryId: 'intro-2', description: 'keep' },
    ],
  };
  const input = {
    careers: [{ company: 'Test', period: '2025.03 ~ 현재', rank: '대리' }],
    certifications: [{ name: 'test', date: '2025.06' }],
    awards: [{ name: 'award', year: '2025' }],
    education: { school: 'School', endDate: '2026.02' },
    platformVariants: { jobkorea: { headline: 'fixture', about: 'new intro' } },
  };
  const before = structuredClone(content);
  const bySection = Object.fromEntries(
    planJobKoreaSections(input, content).map(({ section, payload }) => [section, payload])
  );
  const [career] = bySection.career.careers;
  assert.equal(career.entryId, 'career-row');
  assert.equal(career.positionTitle, 'keep');
  assert.equal(career.isCurrent, true);
  assert.equal(career.endedOn, null);
  assert.deepEqual(career.positionGrade, { customName: '대리' });
  const a = bySection.abilities;
  assert.equal(a.certificates[0].entryId, 'cert-row');
  assert.deepEqual(a.certificates[0].certificate, { code: 'C' });
  assert.equal(a.awards[0].entryId, 'award-row');
  assert.equal(a.awards[0].description, 'keep');
  assert.equal(a.certificateDescription, 'keep');
  for (const key of ['languages', 'languageTests', 'trainings'])
    assert.deepEqual(a[key], content[key]);
  assert.equal(bySection.education.educations[0].researchTopic, 'keep');
  assert.equal(bySection.education.educations[0].entryId, 'edu-row');
  assert.deepEqual(bySection['self-introduction'].selfIntroductions, [
    { entryId: 'intro-1', title: 'fixture', description: 'new intro' },
    content.selfIntroductions[1],
  ]);
  assert.equal(bySection.title, undefined);
  assert.deepEqual(content, before);
});

it('refuses a partial abilities snapshot instead of erasing its unread siblings', () => {
  assert.throws(
    () =>
      planJobKoreaSections(
        { awards: [{ name: 'new' }] },
        { general: {}, certificates: [], awards: [] }
      ),
    /Incomplete/
  );
});
