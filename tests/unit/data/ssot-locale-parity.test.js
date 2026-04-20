const fs = require('fs');
const path = require('path');

const masterDir = path.join(__dirname, '../../../packages/data/resumes/master');

function readLocale(fileName) {
  return JSON.parse(fs.readFileSync(path.join(masterDir, fileName), 'utf-8'));
}

function expectSubsetKeys(source, target) {
  expect(Object.keys(target)).toEqual(expect.arrayContaining(Object.keys(source)));
}

describe('resume locale parity', () => {
  const ko = readLocale('resume_data.json');
  const en = readLocale('resume_data_en.json');
  const ja = readLocale('resume_data_ja.json');

  test('top-level keys in EN and JA include all KO keys', () => {
    expectSubsetKeys(ko, en);
    expectSubsetKeys(ko, ja);
  });

  test('personal sub-keys in EN and JA include all KO keys', () => {
    expectSubsetKeys(ko.personal, en.personal);
    expectSubsetKeys(ko.personal, ja.personal);
  });

  test('summary sub-keys in EN and JA include all KO keys', () => {
    expectSubsetKeys(ko.summary, en.summary);
    expectSubsetKeys(ko.summary, ja.summary);
  });

  test('platform variants for wanted and jobkorea exist in all locales', () => {
    for (const locale of [ko, en, ja]) {
      expect(locale.platformVariants).toBeDefined();
      expect(locale.platformVariants.wanted).toBeDefined();
      expect(locale.platformVariants.jobkorea).toBeDefined();
    }
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
});
