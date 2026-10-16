const fs = require('fs');
const path = require('path');
const { loadPortfolioData } = require('../../../helpers/owner-data');
const {
  generateCareerTimeline,
  generateCareerSection,
  mergeCareerUiMeta,
} = require('../../../../apps/portfolio/lib/cards/timeline');
const { CAREER_UI_META } = require('../../../../apps/portfolio/lib/cards/timeline-career-meta');

const periods = Object.keys(CAREER_UI_META);

function career(index, overrides = {}) {
  return {
    company: `Example ${index}`,
    companyUrl: null,
    period: periods[index % periods.length],
    role: 'Example Engineer',
    myRole: 'Example owner',
    description: 'Example description',
    achievements: ['one', 'two', 'three', 'four', 'five'],
    ...overrides,
  };
}

const careers = (count) => Array.from({ length: count }, (_, index) => career(index));

describe('mergeCareerUiMeta()', () => {
  test('attaches phase/status keyed by the locale-stable period and keeps SSoT fields', () => {
    const [first, second] = periods;
    const out = mergeCareerUiMeta([
      { company: 'A', period: first, role: 'R', achievements: ['x'] },
      { company: 'B', period: second },
    ]);
    expect(out[0].phase).toBe(CAREER_UI_META[first].phase);
    expect(out[1].status).toBe(CAREER_UI_META[second].status);
    expect(out[0].achievements).toEqual(['x']);
  });

  test('keeps explicit phase/status and defaults unknown periods', () => {
    const [explicit] = mergeCareerUiMeta([
      { company: 'A', period: periods[0], phase: '커스텀', status: 'active' },
    ]);
    expect(explicit).toMatchObject({ phase: '커스텀', status: 'active' });
    const [unknown] = mergeCareerUiMeta([{ company: 'U', period: '1999.01 ~ 1999.12' }]);
    expect(unknown).toMatchObject({ phase: '기초', status: 'completed' });
  });

  test('non-array input yields an empty array', () => {
    expect(mergeCareerUiMeta(undefined)).toEqual([]);
    expect(mergeCareerUiMeta(null)).toEqual([]);
  });
});

describe('generateCareerTimeline()', () => {
  test('server-renders one node per career and folds roles after the fourth', () => {
    const html = generateCareerTimeline(careers(6), 'ko');
    expect(html.match(/<li class="timeline-node/g)).toHaveLength(6);
    expect(html.match(/timeline-node--older/g)).toHaveLength(2);
    expect(html).toContain('id="career-timeline"');
    expect(html).toContain('aria-label="경력 타임라인"');
  });

  test.each([
    ['ko', '이전 경력 2개 더 보기', '이전 경력 접기', '경력 타임라인'],
    ['en', 'Show 2 earlier roles', 'Hide earlier roles', 'Career timeline'],
    ['ja', '以前の経歴2件を表示', '以前の経歴を閉じる', '経歴タイムライン'],
  ])('%s earlier-roles button names the action and its count', (locale, more, less, label) => {
    const html = generateCareerTimeline(careers(6), locale);
    expect(html).toContain(`aria-label="${label}"`);
    expect(html).toMatch(
      new RegExp(
        `<button type="button" class="timeline-more-btn" aria-expanded="false" aria-controls="career-timeline" data-label-closed="${more}" data-label-open="${less}">${more}</button>`
      )
    );
  });

  test('no earlier-roles control when every role is visible', () => {
    const html = generateCareerTimeline(careers(4), 'en');
    expect(html).not.toContain('timeline-more');
    expect(html).not.toContain('timeline-node--older');
  });

  test('nodes keep list semantics but are not tabbable or hidden from assistive technology', () => {
    const html = generateCareerTimeline(careers(6), 'ko');
    expect(html).not.toMatch(/tabindex/i);
    expect(html.match(/<li class="timeline-node[^>]*role="listitem"/g)).toHaveLength(6);
    expect(html).not.toMatch(/aria-hidden="true"><div class="timeline-details/);
    expect(html).not.toMatch(/\shidden[\s>=]/);
  });

  test('each role is opened by a native button that controls its details', () => {
    const html = generateCareerTimeline([career(0)], 'ko');
    expect(html).toContain('<div class="timeline-details" id="details-0">');
    expect(html).toMatch(
      /<button type="button" class="timeline-expand-btn" aria-expanded="false" aria-controls="details-0" aria-label="상세 보기 상세 내용 Example 0" data-name-closed="상세 보기 상세 내용 Example 0" data-name-open="접기 상세 내용 Example 0" data-label-closed="상세 보기" data-label-open="접기">/
    );
    expect(html).toContain('<span class="expand-text" data-disclosure-label>상세 보기</span>');
    expect(html).toContain('<ul class="details-achievements"><li>four</li><li>five</li></ul>');
  });

  test('roles without details render no disclosure button', () => {
    const html = generateCareerTimeline(
      [career(0, { description: '', achievements: ['one'] })],
      'en'
    );
    expect(html).not.toContain('timeline-expand-btn');
  });

  test.each([
    ['ko', '단계: ', '현재 진행 중', '진행 중'],
    ['en', 'Phase: ', 'Currently in progress', 'In progress'],
    ['ja', 'フェーズ: ', '現在進行中', '進行中'],
  ])(
    '%s exposes phase and active status through sr-only text',
    (locale, phase, srStatus, visible) => {
      const html = generateCareerTimeline([career(0, { status: 'active' })], locale);
      expect(html).toContain(`<span class="sr-only">${phase}</span>`);
      expect(html).toContain(
        `<span class="sr-only">${srStatus}</span><span aria-hidden="true">${visible}</span>`
      );
      expect(html).toContain('timeline-node--active');
      expect(html).not.toMatch(/<span[^>]*aria-label/);
    }
  );

  test('escapes content and only links http(s) company URLs', () => {
    const unsafe = generateCareerTimeline(
      [career(0, { company: '<b>x</b>', companyUrl: 'javascript:alert(1)' })],
      'en'
    );
    expect(unsafe).toContain(
      '<span class="company-link company-link--text">&lt;b&gt;x&lt;/b&gt;</span>'
    );
    expect(unsafe).not.toContain('javascript:');
    const linked = generateCareerTimeline(
      [career(0, { companyUrl: 'https://example.com/a?b=1&c=2' })],
      'en'
    );
    expect(linked).toContain(
      '<a class="company-link" href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">Example 0</a>'
    );
  });

  test('Japanese prose keeps katakana runs unbroken; other locales are left alone', () => {
    const entry = career(0, {
      achievements: ['セキュリティ基盤を構築', 'two', 'three', 'エンドポイント監視'],
      description: 'システムを運用しました',
    });
    const ja = generateCareerTimeline([entry], 'ja');
    expect(ja).toContain('<span class="atomic-phrase">セキュリティ</span>基盤を構築');
    expect(ja).toContain('<span class="atomic-phrase">エンドポイント</span>監視');
    expect(ja).toContain('<span class="atomic-phrase">システム</span>を運用しました');
    expect(generateCareerTimeline([entry], 'ko')).not.toContain('atomic-phrase');
    expect(generateCareerTimeline([entry], 'en')).not.toContain('atomic-phrase');
  });

  test('returns an empty string without careers and the section falls back to resume cards', () => {
    expect(generateCareerTimeline([], 'ko')).toBe('');
    expect(generateCareerTimeline(undefined, 'ko')).toBe('');
    expect(generateCareerSection([], 'ko', '<li>card</li>')).toBe(
      '<ul class="resume-list"><li>card</li></ul>'
    );
    expect(generateCareerSection(careers(1), 'ko', '<li>card</li>')).toContain('incident-timeline');
  });
});

describe('timeline sources carry no hardcoded career content', () => {
  test('lib/cards/timeline*.js never embed career strings from the locale data', () => {
    const cardsDir = path.resolve(__dirname, '../../../../apps/portfolio/lib/cards');
    const source = fs
      .readdirSync(cardsDir)
      .filter((file) => file.startsWith('timeline'))
      .map((file) => fs.readFileSync(path.join(cardsDir, file), 'utf8'))
      .join('\n');
    const all = ['ko', 'en', 'ja'].flatMap((locale) => loadPortfolioData(locale).careers);
    expect(all.length).toBeGreaterThan(0);
    for (const entry of all) {
      for (const field of ['company', 'role', 'description']) {
        if (typeof entry[field] === 'string' && entry[field].length >= 4) {
          expect(source).not.toContain(entry[field]);
        }
      }
    }
  });
});
