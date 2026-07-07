/**
 * Client-module copy localization contract: JS-injected user-visible strings
 * (aria-labels, live-region announcements, counters) must be locale-aware
 * instead of hardcoded single-language literals.
 */
const fs = require('fs');
const path = require('path');

const MODULES = path.resolve(__dirname, '../../../apps/portfolio/src/scripts/modules');

function read(fileName) {
  return fs.readFileSync(path.join(MODULES, fileName), 'utf8');
}

describe('client copy localization', () => {
  test('ui.js back-to-top label is locale-aware', () => {
    const src = read('ui.js');
    expect(src).toContain('맨 위로');
    expect(src).toContain('ページ上部へ');
    expect(src).toContain('Scroll to top');
  });

  test('timeline aria-label drops incident-response jargon and localizes', () => {
    const src = read('timeline.js');
    expect(src).not.toContain('Career incident response timeline');
    expect(src).toContain('경력 타임라인');
    expect(src).toContain('経歴タイムライン');
    expect(src).toContain('Career timeline');
  });

  test('contact-copy clipboard announcement is locale-aware', () => {
    const src = read('contact-copy.js');
    expect(src).toContain('복사됨');
    expect(src).toContain('コピーしました');
    expect(src).toContain('copied');
  });

  test('skill-radar counter copy is locale-aware', () => {
    const src = read('skill-radar.js');
    expect(src).toContain('개 기술');
    expect(src).toContain('件のスキル');
  });

  test('skill-radar tier labels are locale-aware', () => {
    const src = read('skill-radar.js');
    // KO / JA tier names next to the English defaults.
    expect(src).toContain('주력');
    expect(src).toContain('실무 적용');
    expect(src).toContain('활용 가능');
    expect(src).toContain('主力');
    expect(src).toContain('Primary');
  });

  test('skill-radar fallback evidence labels are locale-aware', () => {
    const src = read('skill-radar-data.js');
    expect(src).toContain('주요 운영 경험');
    expect(src).toContain('主な運用経験');
    expect(src).toContain('Primary operating evidence');
  });

  test('skill-radar evidence drawer heading is locale-aware', () => {
    const src = read('skill-radar.js');
    // No hardcoded English-only ' Evidence' drawer heading.
    expect(src).not.toContain("createTextNode(' Evidence')");
    expect(src).toContain('근거');
    expect(src).toContain('根拠');
    expect(src).toContain('Evidence');
  });
});

describe('japanese template metadata copy', () => {
  const fs2 = require('fs');
  const path2 = require('path');
  test('JA addressLocality uses the correct kanji for Siheung-si (始興市)', () => {
    const src = fs2.readFileSync(
      path2.resolve(__dirname, '../../../apps/portfolio/lib/japanese-template/sections.js'),
      'utf8'
    );
    expect(src).toContain('始興市');
    // 帋 (paper) was a typo for 始.
    expect(src).not.toContain('帋興市');
  });
});
