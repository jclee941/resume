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

const TIMELINE_PATH = path.resolve(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/timeline.js'
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
    expect(source).not.toMatch(/role:\s*'보안운영 엔지니어/);
    expect(source).not.toMatch(/description:\s*'넥스트레이드 금융 거래소/);
  });
});

describe('mergeCareerUiMeta()', () => {
  let mergeCareerUiMeta;
  beforeAll(async () => {
    ({ mergeCareerUiMeta } = await import(TIMELINE_PATH));
  });

  test('S1: attaches phase/status UI metadata keyed by locale-stable period', () => {
    // Keyed by `period` (not `company`) so the same metadata applies across
    // ko/en/ja, where company names are localized but the tenure period is not.
    const out = mergeCareerUiMeta([
      {
        company: 'ITCEN CTS Co., Ltd.',
        period: '2025.03 ~ 2026.02',
        role: 'Security Infrastructure Engineer (SIEM/Security)',
        achievements: ['Built a SIEM detection/response pipeline'],
      },
      { company: 'メタネットMプラットフォーム', period: '2020.08 ~ 2021.08', role: 'インフラ運用' },
    ]);
    expect(out[0].phase).toBe('운영');
    expect(out[0].status).toBe('completed');
    expect(out[1].phase).toBe('자동화');
    expect(out[0].role).toBe('Security Infrastructure Engineer (SIEM/Security)');
    // SSoT-derived achievements pass through untouched (feeds timeline Impact text).
    expect(out[0].achievements).toEqual(['Built a SIEM detection/response pipeline']);
  });

  test('S2: preserves explicit phase/status if already present', () => {
    const out = mergeCareerUiMeta([
      {
        company: '(주)아이티센 CTS',
        period: '2025.03 ~ 2026.02',
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
  beforeAll(async () => {
    ({ createTimelineViewModel } = await import(TIMELINE_RENDERING_PATH));
    global.document = { documentElement: { lang: 'ko' } };
  });

  afterAll(() => {
    delete global.document;
  });

  test('renders company text without a dead # link when companyUrl is absent', () => {
    const model = createTimelineViewModel(
      {
        company: '(주)조인트리',
        companyUrl: null,
        period: '2021.09 ~ 2022.04',
        phase: '구축',
        status: 'completed',
        role: '네트워크 보안 엔지니어',
        myRole: '네트워크 보안 구축 담당',
        description: 'NSX-T 마이크로세그멘테이션 적용',
        achievements: ['동서 트래픽 보안 정책 세분화'],
      },
      0
    );

    expect(model.companyUrl).toBeNull();
  });
});
