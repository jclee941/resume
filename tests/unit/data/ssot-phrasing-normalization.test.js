const fs = require('fs');
const path = require('path');

// Guard for docs/conventions/resume-phrasing-style-guide.md ([guard] rules).
const masterDir = path.join(__dirname, '../../../packages/data/resumes/master');

function readLocale(fileName) {
  return JSON.parse(fs.readFileSync(path.join(masterDir, fileName), 'utf-8'));
}

const ko = readLocale('resume_data.json');
const en = readLocale('resume_data_en.json');
const ja = readLocale('resume_data_ja.json');

const BANNED_METRIC_PATTERN =
  /\d+(?:[.,]\d+)?\s*(?:%|퍼센트|パーセント|percent)|(?<![A-Za-z0-9])\d+(?:\.\d+)?\s*(?:배|倍)(?![A-Za-z가-힣])|\b\d+\s*[xX]\b(?!\d)|\b\d+\+|수백|수천|수십\s*대|数百|数千|hundreds of|thousands of/;

function proseEntries(data, locale) {
  const entries = [];
  const add = (fieldPath, text) => {
    if (typeof text === 'string' && text.length > 0) entries.push({ path: `${locale}:${fieldPath}`, text });
  };
  add('summary.profileStatement', data.summary.profileStatement);
  (data.summary.coreCompetencies || []).forEach((t, i) => add(`summary.coreCompetencies[${i}]`, t));
  const about = data.summary.aboutSection || {};
  ['careerHighlights', 'techPhilosophy', 'currentFocus'].forEach((key) =>
    (about[key] || []).forEach((t, i) => add(`summary.aboutSection.${key}[${i}]`, t))
  );
  Object.entries(data.platformVariants || {}).forEach(([name, v]) => add(`platformVariants.${name}.about`, v.about));
  (data.careers || []).forEach((career, c) => {
    ['description', 'wantedSummary', 'note', 'myRole', 'continuousEngagement'].forEach((key) =>
      add(`careers[${c}].${key}`, career[key])
    );
    (career.projects || []).forEach((project, p) => {
      add(`careers[${c}].projects[${p}].description`, project.description);
      (project.achievements || []).forEach((t, a) => add(`careers[${c}].projects[${p}].achievements[${a}]`, t));
    });
  });
  (data.projects || []).forEach((project, i) => add(`projects[${i}].description`, project.description));
  if (data.careerGap) {
    add('careerGap.reason', data.careerGap.reason);
    add('careerGap.result', data.careerGap.result);
  }
  (data.personalProjects || []).forEach((project, i) => {
    add(`personalProjects[${i}].description`, project.description);
    add(`personalProjects[${i}].tagline`, project.tagline);
    (project.highlights || []).forEach((t, h) => add(`personalProjects[${i}].highlights[${h}]`, t));
  });
  (data.ossContributions || []).forEach((item, i) => add(`ossContributions[${i}].description`, item.description));
  (data.achievements || []).forEach((t, i) => add(`achievements[${i}]`, t));
  (data.infrastructure || []).forEach((item, i) => add(`infrastructure[${i}].description`, item.description));
  Object.entries(data.coverLetter || {}).forEach(([loc, letter]) => {
    add(`coverLetter.${loc}.headline`, letter.headline);
    (letter.paragraphs || []).forEach((t, i) => add(`coverLetter.${loc}.paragraphs[${i}]`, t));
    add(`coverLetter.${loc}.closing`, letter.closing);
  });
  Object.entries(data.careerSummary || {}).forEach(([loc, section]) => {
    add(`careerSummary.${loc}.headline`, section.headline);
    (section.paragraphs || []).forEach((t, i) => add(`careerSummary.${loc}.paragraphs[${i}]`, t));
    add(`careerSummary.${loc}.closing`, section.closing);
  });
  return entries;
}

const SENTENCE_FIELDS_KO = (data) => {
  const out = [];
  const add = (fieldPath, text) => typeof text === 'string' && out.push({ path: fieldPath, text });
  add('summary.profileStatement', data.summary.profileStatement);
  (data.summary.aboutSection.careerHighlights || []).forEach((t, i) => add(`summary.aboutSection.careerHighlights[${i}]`, t));
  (data.careers || []).forEach((career, c) => {
    add(`careers[${c}].description`, career.description);
    (career.projects || []).forEach((project, p) => add(`careers[${c}].projects[${p}].description`, project.description));
  });
  (data.projects || []).forEach((project, i) => add(`projects[${i}].description`, project.description));
  add('careerGap.reason', data.careerGap.reason);
  (data.personalProjects || []).forEach((project, i) => add(`personalProjects[${i}].description`, project.description));
  (data.ossContributions || []).forEach((item, i) => add(`ossContributions[${i}].description`, item.description));
  (data.achievements || []).forEach((t, i) => add(`achievements[${i}]`, t));
  return out;
};

const NOUN_FIELDS_KO = (data) => {
  const out = [];
  const add = (fieldPath, text) => typeof text === 'string' && out.push({ path: fieldPath, text });
  (data.summary.coreCompetencies || []).forEach((t, i) => add(`summary.coreCompetencies[${i}]`, t));
  (data.summary.aboutSection.currentFocus || []).forEach((t, i) => add(`summary.aboutSection.currentFocus[${i}]`, t));
  (data.careers || []).forEach((career, c) => {
    add(`careers[${c}].wantedSummary`, career.wantedSummary);
    add(`careers[${c}].myRole`, career.myRole);
    (career.projects || []).forEach((project, p) =>
      (project.achievements || []).forEach((t, a) => add(`careers[${c}].projects[${p}].achievements[${a}]`, t))
    );
  });
  add('careerGap.result', data.careerGap.result);
  (data.personalProjects || []).forEach((project, i) =>
    (project.highlights || []).forEach((t, h) => add(`personalProjects[${i}].highlights[${h}]`, t))
  );
  (data.infrastructure || []).forEach((item, i) => add(`infrastructure[${i}].description`, item.description));
  Object.entries(data.sectionDescriptions || {}).forEach(([key, t]) => add(`sectionDescriptions.${key}`, t));
  return out;
};

describe('SSOT phrasing normalization guard', () => {
  test('prose contains no banned quantified-claim patterns (all locales)', () => {
    const violations = [ ...proseEntries(ko, 'ko'), ...proseEntries(en, 'en'), ...proseEntries(ja, 'ja') ]
      .filter(({ text }) => BANNED_METRIC_PATTERN.test(text))
      .map(({ path: p, text }) => `${p} :: ${text.match(BANNED_METRIC_PATTERN)[0]} :: ${text.slice(0, 60)}`);
    expect(violations).toEqual([]);
  });

  test('KO terminology canon: Slack/SMS notation, no banned variants', () => {
    const koJson = JSON.stringify(ko);
    expect(koJson).not.toMatch(/Slack·SMS/);
    expect(koJson).not.toMatch(/매매체결 시스템/);
  });

  test('workType has no space before parenthesis', () => {
    const violations = ko.careers.filter((c) => c.workType && /\s\(/.test(c.workType)).map((c) => `${c.id}: ${c.workType}`);
    expect(violations).toEqual([]);
  });

  test('teamSize leads with team descriptor, not disclosure', () => {
    const violations = ko.careers
      .filter((c) => c.teamSize && c.teamSize.startsWith('규모 미공개'))
      .map((c) => `${c.id}: ${c.teamSize}`);
    expect(violations).toEqual([]);
  });

  test('availability compound equals current.status · current.availability', () => {
    expect(ko.availability).toBe(`${ko.current.status} · ${ko.current.availability}`);
  });

  test('hope.roles mirrors current.desiredRoles and contact mirrors personal', () => {
    expect(ko.hope.roles).toEqual(ko.current.desiredRoles);
    expect(ko.contact.email).toBe(ko.personal.email);
    expect(ko.contact.phone).toBe(ko.personal.phone);
    expect(ko.contact.github).toBe(ko.personal.github);
  });

  test('KO sentence-family fields end with 다.', () => {
    const violations = SENTENCE_FIELDS_KO(ko)
      .filter(({ text }) => !/다\.$/.test(text.trim()))
      .map(({ path: p, text }) => `${p} :: ...${text.slice(-30)}`);
    expect(violations).toEqual([]);
  });

  test('KO noun-family fields contain no polite-sentence endings (-니다)', () => {
    const violations = NOUN_FIELDS_KO(ko)
      .filter(({ text }) => /니다(?![가-힣])/.test(text))
      .map(({ path: p, text }) => `${p} :: ${text.slice(0, 60)}`);
    expect(violations).toEqual([]);
  });

  test('runtime placeholders survive in totalExperience', () => {
    expect(ko.summary.totalExperience).toBe('재직 합계');
    expect(en.summary.totalExperience).toBe('working total');
    expect(ja.summary.totalExperience).toBe('在職合計');
  });

  test('careers[].workType semantic parity across locales', () => {
    const WORK_TYPE_PARITY = {
      '프리랜서': { en: 'Freelance', ja: 'フリーランス' },
      '정규직(파견)': { en: 'Full-time (Dispatched)', ja: '正社員(派遣)' },
      '정규직': { en: 'Full-time', ja: '正社員' },
      'SI+SM': { en: 'SI+SM', ja: 'SI+SM' },
    };
    const violations = [];
    ko.careers.forEach((career, i) => {
      const expected = WORK_TYPE_PARITY[career.workType];
      if (!expected) {
        violations.push(`${career.id}: unmapped KO workType "${career.workType}"`);
        return;
      }
      if (en.careers[i].workType !== expected.en) {
        violations.push(`${career.id}: en="${en.careers[i].workType}" expected "${expected.en}"`);
      }
      if (ja.careers[i].workType !== expected.ja) {
        violations.push(`${career.id}: ja="${ja.careers[i].workType}" expected "${expected.ja}"`);
      }
    });
    expect(violations).toEqual([]);
  });
});
