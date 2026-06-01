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

  test('S1: attaches phase/status UI metadata to known companies', () => {
    const out = mergeCareerUiMeta([
      {
        company: '(주)아이티센 CTS',
        role: '보안운영 엔지니어 (SOC/Security)',
        achievements: ['SIEM 탐지·대응 파이프라인 구축'],
      },
      { company: '(주)메타넷엠플랫폼', role: '인프라 운영 엔지니어' },
    ]);
    expect(out[0].phase).toBe('운영');
    expect(out[0].status).toBe('completed');
    expect(out[1].phase).toBe('자동화');
    expect(out[0].role).toBe('보안운영 엔지니어 (SOC/Security)');
    // SSoT-derived achievements pass through untouched (feeds timeline Impact text).
    expect(out[0].achievements).toEqual(['SIEM 탐지·대응 파이프라인 구축']);
  });

  test('S2: preserves explicit phase/status if already present', () => {
    const out = mergeCareerUiMeta([
      { company: '(주)아이티센 CTS', phase: '커스텀', status: 'active' },
    ]);
    expect(out[0].phase).toBe('커스텀');
    expect(out[0].status).toBe('active');
  });

  test('uses default UI metadata for unknown companies', () => {
    const out = mergeCareerUiMeta([{ company: 'Unknown Corp' }]);
    expect(out[0].phase).toBe('기초');
    expect(out[0].status).toBe('completed');
  });

  test('S3: edge — non-array input yields empty array (no throw)', () => {
    expect(mergeCareerUiMeta(undefined)).toEqual([]);
    expect(mergeCareerUiMeta(null)).toEqual([]);
    expect(mergeCareerUiMeta([])).toEqual([]);
  });
});
