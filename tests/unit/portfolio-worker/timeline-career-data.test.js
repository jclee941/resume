/**
 * Unit tests for the career-timeline data path.
 *
 * After the SSoT refactor, timeline.js no longer hardcodes career content.
 * It reads window.__RESUME_CHAT_DATA__.careers (build-injected from the SSoT)
 * and merges UI-only phase/status via mergeCareerUiMeta(). These tests pin that
 * pure merge behavior and assert the hardcoded fallback is gone from source.
 */
const fs = require('fs');
const path = require('path');

const TIMELINE_PATH = path.resolve(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/timeline.js'
);

describe('timeline.js source contract (no hardcoded careers)', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(TIMELINE_PATH, 'utf8');
  });

  test('reads build-injected __RESUME_CHAT_DATA__.careers', () => {
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
        role: 'Security Operations Engineer (SOC/Security)',
        achievements: ['Built a SIEM detection/response pipeline'],
      },
      { company: 'メタネットMプラットフォーム', period: '2019.12 ~ 2021.08', role: 'インフラ運用' },
    ]);
    expect(out[0].phase).toBe('운영');
    expect(out[0].status).toBe('completed');
    expect(out[1].phase).toBe('자동화');
    expect(out[0].role).toBe('Security Operations Engineer (SOC/Security)');
    // SSoT-derived achievements pass through untouched (feeds timeline Impact text).
    expect(out[0].achievements).toEqual(['Built a SIEM detection/response pipeline']);
  });

  test('S2: preserves explicit phase/status if already present', () => {
    const out = mergeCareerUiMeta([
      { company: '(주)아이티센 CTS', period: '2025.03 ~ 2026.02', phase: '커스텀', status: 'active' },
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
