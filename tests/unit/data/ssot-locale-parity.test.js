const fs = require('fs');
const path = require('path');

const masterDir = path.join(__dirname, '../../../packages/data/resumes/master');

function readLocale(fileName) {
  return JSON.parse(fs.readFileSync(path.join(masterDir, fileName), 'utf-8'));
}

function expectExactKeys(source, target) {
  expect(Object.keys(target).sort()).toEqual(Object.keys(source).sort());
}

function expectStableIdsMatch(koItems, localizedItems, label) {
  expect(localizedItems.map((item) => item.id)).toEqual(koItems.map((item) => item.id));
  expect(new Set(koItems.map((item) => item.id)).size).toBe(koItems.length);
  for (const item of localizedItems) {
    expect(typeof item.id).toBe('string');
    expect(item.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
  for (const item of koItems) {
    expect(typeof item.id).toBe('string');
    expect(item.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
  expect(koItems.length).toBeGreaterThan(0);
  expect(localizedItems.length).toBeGreaterThan(0);
  expect(label).toBeTruthy();
}

function projectEvidenceShape(resume) {
  return Object.fromEntries(
    resume.personalProjects
      .filter((project) => project.fullStackEvidence)
      .map((project) => [
        project.id,
        {
          keys: Object.keys(project.fullStackEvidence),
          architectureStepCount: project.fullStackEvidence.architectureSteps.length,
        },
      ])
  );
}

describe('resume locale parity', () => {
  const ko = readLocale('resume_data.json');
  const en = readLocale('resume_data_en.json');
  const ja = readLocale('resume_data_ja.json');

  test('top-level keys in EN and JA exactly match KO keys', () => {
    expectExactKeys(ko, en);
    expectExactKeys(ko, ja);
  });

  test('personal sub-keys in EN and JA exactly match KO keys', () => {
    expectExactKeys(ko.personal, en.personal);
    expectExactKeys(ko.personal, ja.personal);
  });

  test('summary sub-keys in EN and JA exactly match KO keys', () => {
    expectExactKeys(ko.summary, en.summary);
    expectExactKeys(ko.summary, ja.summary);
  });

  test('platform variants for wanted and jobkorea exist in all locales', () => {
    for (const locale of [ko, en, ja]) {
      expect(locale.platformVariants).toBeDefined();
      expect(locale.platformVariants.wanted).toBeDefined();
      expect(locale.platformVariants.jobkorea).toBeDefined();
    }
  });

  test('JobKorea default job code follows KO hope primary job code', () => {
    expect(ko.platformVariants.jobkorea.defaultJobCode).toBe(ko.hope.jobCodes[0]);
    expect(ko.platformVariants.jobkorea.defaultJobCode).toMatch(/^\d+$/);
    expect(ko.hope.jobCodes).toContain(ko.platformVariants.jobkorea.defaultJobCode);
  });

  test('KO resume prose avoids metric-like server scale phrases', () => {
    expect(JSON.stringify(ko)).not.toMatch(/수백\s*대/);
  });

  test('critical array lengths match across locales', () => {
    expect(en.summary.expertise).toHaveLength(ko.summary.expertise.length);
    expect(ja.summary.expertise).toHaveLength(ko.summary.expertise.length);

    expect(en.summary.coreCompetencies).toHaveLength(ko.summary.coreCompetencies.length);
    expect(ja.summary.coreCompetencies).toHaveLength(ko.summary.coreCompetencies.length);

    expect(en.ossContributions).toHaveLength(ko.ossContributions.length);
    expect(ja.ossContributions).toHaveLength(ko.ossContributions.length);

    expect(en.careers).toHaveLength(ko.careers.length);
    expect(ja.careers).toHaveLength(ko.careers.length);
  });

  test('stable entity IDs match across locales', () => {
    expectStableIdsMatch(ko.careers, en.careers, 'careers/en');
    expectStableIdsMatch(ko.careers, ja.careers, 'careers/ja');
    expectStableIdsMatch(ko.projects, en.projects, 'projects/en');
    expectStableIdsMatch(ko.projects, ja.projects, 'projects/ja');
    expectStableIdsMatch(ko.personalProjects, en.personalProjects, 'personalProjects/en');
    expectStableIdsMatch(ko.personalProjects, ja.personalProjects, 'personalProjects/ja');
    expectStableIdsMatch(ko.certifications, en.certifications, 'certifications/en');
    expectStableIdsMatch(ko.certifications, ja.certifications, 'certifications/ja');
    expectStableIdsMatch(ko.awards, en.awards, 'awards/en');
    expectStableIdsMatch(ko.awards, ja.awards, 'awards/ja');
    expectStableIdsMatch(ko.infrastructure, en.infrastructure, 'infrastructure/en');
    expectStableIdsMatch(ko.infrastructure, ja.infrastructure, 'infrastructure/ja');
    expectStableIdsMatch(ko.ossContributions, en.ossContributions, 'ossContributions/en');
    expectStableIdsMatch(ko.ossContributions, ja.ossContributions, 'ossContributions/ja');
    expectStableIdsMatch(
      ko.careers.flatMap((career) => career.projects || []),
      en.careers.flatMap((career) => career.projects || []),
      'careerProjects/en'
    );
    expectStableIdsMatch(
      ko.careers.flatMap((career) => career.projects || []),
      ja.careers.flatMap((career) => career.projects || []),
      'careerProjects/ja'
    );
  });

  test('featured project evidence keys and architecture counts match across locales', () => {
    const expectedFeatured = [
      'safetywallet-cf-workers-pwa',
      'resume-portfolio',
      'ip-blacklist-platform',
    ];
    for (const locale of [ko, en, ja]) {
      const sorted = [...locale.personalProjects].sort(
        (left, right) => left.displayOrder - right.displayOrder
      );
      expect(sorted.slice(0, 3).map(({ id }) => id)).toEqual(expectedFeatured);
      expect(sorted.slice(0, 3).map(({ displayOrder }) => displayOrder)).toEqual([1, 2, 3]);
    }

    expect(projectEvidenceShape(en)).toEqual(projectEvidenceShape(ko));
    expect(projectEvidenceShape(ja)).toEqual(projectEvidenceShape(ko));
  });
});
