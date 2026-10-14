/**
 * Unit tests for the career-timeline data path.
 *
 * After the SSoT refactor, timeline.js no longer hardcodes career content.
 * It reads window.__RESUME_CHAT_DATA__.careers (client-loaded from the SSoT)
 * and merges UI-only phase/status via mergeCareerUiMeta(). These tests pin that
 * pure merge behavior and assert the hardcoded fallback is gone from source.
 */
const fs = require('fs');
const path = require('path');
const { loadPortfolioData } = require('../../helpers/owner-data');

const TIMELINE_PATH = path.resolve(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/timeline.js'
);
const TIMELINE_CAREER_META_PATH = path.resolve(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/timeline-career-meta.js'
);
const TIMELINE_RENDERING_PATH = path.resolve(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/timeline-rendering.js'
);

describe('timeline.js source contract (no hardcoded careers)', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(TIMELINE_PATH, 'utf8');
  });

  test('reads client-loaded __RESUME_CHAT_DATA__.careers', () => {
    expect(source).toMatch(/window\.__RESUME_CHAT_DATA__/);
  });

  test('no longer references the never-injected window.RESUME_DATA', () => {
    expect(source).not.toMatch(/window\.RESUME_DATA/);
  });

  test('does not embed hardcoded career company strings', () => {
    const careers = ['ko', 'en', 'ja'].flatMap((locale) => loadPortfolioData(locale).careers);
    expect(careers.length).toBeGreaterThan(0);
    for (const career of careers) {
      for (const field of ['company', 'role', 'description']) {
        if (typeof career[field] === 'string' && career[field].length >= 4) {
          expect(source).not.toContain(career[field]);
        }
      }
    }
  });
});

describe('mergeCareerUiMeta()', () => {
  let mergeCareerUiMeta;
  let CAREER_UI_META;
  beforeAll(async () => {
    ({ mergeCareerUiMeta } = await import(TIMELINE_PATH));
    ({ CAREER_UI_META } = await import(TIMELINE_CAREER_META_PATH));
  });

  test('S1: attaches phase/status UI metadata keyed by locale-stable period', () => {
    // Keyed by `period` (not `company`) so the same metadata applies across
    // ko/en/ja, where company names are localized but the tenure period is not.
    const [firstPeriod, secondPeriod] = Object.keys(CAREER_UI_META);
    expect(firstPeriod).toBeTruthy();
    expect(secondPeriod).toBeTruthy();
    const out = mergeCareerUiMeta([
      {
        company: 'Example Corp',
        period: firstPeriod,
        role: 'Example Engineer',
        achievements: ['Built an example pipeline'],
      },
      { company: '예시회사', period: secondPeriod, role: '예시 역할' },
    ]);
    expect(out[0].phase).toBe(CAREER_UI_META[firstPeriod].phase);
    expect(out[0].status).toBe(CAREER_UI_META[firstPeriod].status);
    expect(out[1].phase).toBe(CAREER_UI_META[secondPeriod].phase);
    expect(out[1].status).toBe(CAREER_UI_META[secondPeriod].status);
    expect(out[0].role).toBe('Example Engineer');
    // SSoT-derived achievements pass through untouched (feeds timeline Impact text).
    expect(out[0].achievements).toEqual(['Built an example pipeline']);
  });

  test('S2: preserves explicit phase/status if already present', () => {
    const out = mergeCareerUiMeta([
      {
        company: '예시회사',
        period: Object.keys(CAREER_UI_META)[0],
        phase: '커스텀',
        status: 'active',
      },
    ]);
    expect(out[0].phase).toBe('커스텀');
    expect(out[0].status).toBe('active');
  });

  test('uses default UI metadata for unknown periods', () => {
    const out = mergeCareerUiMeta([{ company: 'Unknown Corp', period: '1999.01 ~ 1999.12' }]);
    expect(out[0].phase).toBe('기초');
    expect(out[0].status).toBe('completed');
  });

  test('S3: edge — non-array input yields empty array (no throw)', () => {
    expect(mergeCareerUiMeta(undefined)).toEqual([]);
    expect(mergeCareerUiMeta(null)).toEqual([]);
    expect(mergeCareerUiMeta([])).toEqual([]);
  });
});

describe('createTimelineViewModel()', () => {
  let createTimelineViewModel;
  let createTimelineNode;
  beforeAll(async () => {
    ({ createTimelineViewModel, createTimelineNode } = await import(TIMELINE_RENDERING_PATH));
    global.document = { documentElement: { lang: 'ko' } };
  });

  afterAll(() => {
    delete global.document;
  });

  test('renders company text without a dead # link when companyUrl is absent', () => {
    const model = createTimelineViewModel(
      {
        company: '예시회사',
        companyUrl: null,
        period: '2000.01 ~ 2000.12',
        phase: '구축',
        status: 'completed',
        role: '예시 역할',
        myRole: '예시 담당',
        description: '예시 설명',
        achievements: ['예시 성과'],
      },
      0
    );

    expect(model.companyUrl).toBeNull();
  });

  test.each([
    ['ko', '단계: 구축', '현재 진행 중', '진행 중'],
    ['en', 'Phase: Build', 'Currently in progress', 'In progress'],
    ['ja', 'フェーズ: 構築', '現在進行中', '進行中'],
  ])(
    '%s createTimelineNode exposes phase and active status via sr-only spans without aria-label on generic spans',
    (lang, expectedPhaseText, expectedStatusSrText, expectedStatusVisibleText) => {
      const makeFakeElement = (tag) => {
        const node = {
          tagName: tag.toUpperCase(),
          className: '',
          id: '',
          tabIndex: -1,
          dataset: {},
          attributes: {},
          children: [],
          _text: '',
          get textContent() {
            if (this.children.length === 0) return this._text;
            return (
              this._text +
              this.children
                .map((child) => (typeof child === 'string' ? child : child.textContent))
                .join('')
            );
          },
          set textContent(value) {
            this._text = String(value);
            this.children = [];
          },
          setAttribute(name, value) {
            this.attributes[name] = String(value);
          },
          getAttribute(name) {
            return Object.prototype.hasOwnProperty.call(this.attributes, name)
              ? this.attributes[name]
              : null;
          },
          append(...items) {
            this.children.push(...items);
          },
          appendChild(child) {
            this.children.push(child);
            return child;
          },
        };
        return node;
      };

      global.document = {
        documentElement: { lang },
        createElement: makeFakeElement,
        createElementNS: (_ns, tag) => makeFakeElement(tag),
        createDocumentFragment: () => makeFakeElement('#fragment'),
      };

      const item = createTimelineNode(
        {
          company: 'Example Co',
          period: '2026.01 ~ 현재',
          phase: '구축',
          status: 'active',
          role: 'Engineer',
          myRole: 'Owner',
          description: 'Description',
          achievements: ['One'],
        },
        0
      );

      const [, content] = item.children;
      const [header] = content.children;
      const [, badges] = header.children;
      const [phaseBadge, statusBadge] = badges.children;

      expect(phaseBadge.getAttribute('aria-label')).toBeNull();
      expect(phaseBadge.textContent).toBe(expectedPhaseText);
      const phaseSr = phaseBadge.children.find(
        (child) => typeof child === 'object' && child.className === 'sr-only'
      );
      expect(phaseSr).toBeDefined();
      expect(phaseSr.textContent).toBe(`${expectedPhaseText.split(':')[0]}: `);

      expect(statusBadge.getAttribute('aria-label')).toBeNull();
      const statusSr = statusBadge.children.find(
        (child) => typeof child === 'object' && child.className === 'sr-only'
      );
      const statusVisible = statusBadge.children.find(
        (child) => typeof child === 'object' && child.getAttribute('aria-hidden') === 'true'
      );
      expect(statusSr).toBeDefined();
      expect(statusSr.textContent).toBe(expectedStatusSrText);
      expect(statusVisible).toBeDefined();
      expect(statusVisible.textContent).toBe(expectedStatusVisibleText);
    }
  );
});
