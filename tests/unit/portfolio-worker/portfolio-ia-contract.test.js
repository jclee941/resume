const fs = require('node:fs');
const path = require('node:path');

const { buildJapaneseTemplate } = require('../../../apps/portfolio/lib/html-transformer');

const PORTFOLIO_ROOT = path.resolve(__dirname, '../../../apps/portfolio');
const SECTION_ORDER = [
  'hero',
  'projects',
  'skills',
  'resume',
  'operated',
  'about',
  'cover-letter',
  'certifications',
  'contact',
];
const NAV_LINKS = [
  ['#projects', 'projects'],
  ['#skills', 'stack'],
  ['#resume', 'experience'],
  ['#contact', 'contact'],
];
const HEADING_BY_LOCALE = {
  ko: {
    projects: '대표 프로젝트',
    skills: '풀스택 역량',
    resume: '경력',
    operated: '보안·인프라 전문성',
    about: '소개',
    'cover-letter': '업무 방식',
    certifications: '자격·학습',
    contact: '연락처',
  },
  en: {
    projects: 'Featured Builds',
    skills: 'Full-Stack Capabilities',
    resume: 'Experience',
    operated: 'Security & Infrastructure Depth',
    about: 'About',
    'cover-letter': 'How I Work',
    certifications: 'Credentials & Learning',
    contact: 'Contact',
  },
  ja: {
    projects: '注目プロジェクト',
    skills: 'フルスタックの領域',
    resume: '職歴',
    operated: 'セキュリティ・インフラの専門性',
    about: '紹介',
    'cover-letter': '仕事の進め方',
    certifications: '資格・学習',
    contact: '連絡先',
  },
};
const SUMMARY_BY_LOCALE = {
  ko: '업무 방식 자세히 보기',
  en: 'Read how I work',
  ja: '仕事の進め方を読む',
};

function readTemplate(fileName) {
  return fs.readFileSync(path.join(PORTFOLIO_ROOT, fileName), 'utf8');
}

function mainMarkup(html) {
  const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  if (!match) throw new Error('main landmark is missing');
  return match[1];
}

function sectionMarkup(html, id) {
  const main = mainMarkup(html);
  const start = main.indexOf(`id="${id}"`);
  if (start === -1) throw new Error(`section #${id} is missing`);
  const next = main.indexOf('<section', start + 1);
  return main.slice(start, next === -1 ? undefined : next);
}

function sectionIds(html) {
  return [...mainMarkup(html).matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
}

function sectionHeading(html, id) {
  const match = sectionMarkup(html, id).match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/);
  return (match?.[1] ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertPortfolioIa(html, locale) {
  expect(sectionIds(html)).toEqual(SECTION_ORDER);

  for (const [id, heading] of Object.entries(HEADING_BY_LOCALE[locale])) {
    expect(sectionHeading(html, id)).toBe(heading);
  }

  const nav = html.match(/<div id="nav-links"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  const links = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(
    ([, href, label]) => [href, label.trim()]
  );
  expect(links).toEqual(NAV_LINKS);

  const cover = sectionMarkup(html, 'cover-letter');
  expect(cover).toMatch(/<details\b[^>]*>/);
  expect(cover).not.toMatch(/<details\b[^>]*\bopen(?:\s|=|>)/);
  expect(cover).toContain(`<summary>${SUMMARY_BY_LOCALE[locale]}</summary>`);
  expect(cover).toContain('<!-- COVER_LETTER_PLACEHOLDER -->');

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  for (const [href] of NAV_LINKS) {
    expect(ids.filter((id) => id === href.slice(1))).toHaveLength(1);
  }
}

describe('portfolio first-scan information architecture', () => {
  const pages = {
    ko: readTemplate('index.html'),
    en: readTemplate('index-en.html'),
    ja: buildJapaneseTemplate(readTemplate('index.html')),
  };

  test.each(Object.entries(pages))(
    '%s follows the approved section and navigation contract',
    (locale, html) => {
      assertPortfolioIa(html, locale);
    }
  );

  test('rejects swapped sections, duplicate IDs, a missing nav target, and missing summary', () => {
    const valid = pages.ko;
    const projects = sectionMarkup(valid, 'projects');
    const skills = sectionMarkup(valid, 'skills');
    const swapped = valid
      .replace(projects, '__PROJECTS__')
      .replace(skills, projects)
      .replace('__PROJECTS__', skills);
    const duplicateId = valid.replace('id="about"', 'id="projects"');
    const missingTarget = valid.replace('id="contact"', 'id="contact-missing"');
    const missingSummary = valid.replace('<summary>업무 방식 자세히 보기</summary>', '');

    expect(() => assertPortfolioIa(swapped, 'ko')).toThrow();
    expect(() => assertPortfolioIa(duplicateId, 'ko')).toThrow();
    expect(() => assertPortfolioIa(missingTarget, 'ko')).toThrow();
    expect(() => assertPortfolioIa(missingSummary, 'ko')).toThrow();
  });
});
