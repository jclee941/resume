/**
 * Copy-localization contract: user-visible UI labels must match the page
 * language. Guards against English-only strings leaking onto the KO source
 * page and Korean strings leaking onto the generated JA page, plus the
 * removal of terminal-chrome footer copy (DESIGN.md: no terminal chrome).
 */
const fs = require('fs');
const path = require('path');

const PORTFOLIO = path.resolve(__dirname, '../../../apps/portfolio');

function read(fileName) {
  return fs.readFileSync(path.join(PORTFOLIO, fileName), 'utf8');
}

function extractLocale(workerSrc, constName) {
  const match = workerSrc.match(new RegExp(`const ${constName} = \`([\\s\\S]*?)\`;`));
  return match ? match[1] : '';
}

describe('copy localization: skills search UI', () => {
  test('KO source page uses Korean skill-search labels', () => {
    const ko = read('index.html');
    expect(ko).toContain('aria-label="기술 역량 매트릭스"');
    expect(ko).toContain('>기술 검색</label>');
    expect(ko).toContain('placeholder="기술 검색..."');
    expect(ko).toContain('aria-label="기술 이름으로 검색"');
    expect(ko).not.toContain('Filter skills');
    expect(ko).not.toContain('Skill Capability Matrix');
  });

  test('EN source page keeps English skill-search labels', () => {
    const en = read('index-en.html');
    expect(en).toContain('Filter skills');
  });

  test('generated JA locale uses Japanese skill-search labels', () => {
    const worker = read('worker.js');
    const jaLocale = extractLocale(worker, 'INDEX_JA_HTML');
    expect(jaLocale).toContain('aria-label="スキルマトリクス"');
    expect(jaLocale).toContain('>スキル検索</label>');
    expect(jaLocale).toContain('placeholder="スキル検索..."');
    expect(jaLocale).not.toContain('기술 검색');
  });
});

describe('copy cleanup: footer terminal chrome removed', () => {
  test('logout / Connection closed are gone from all locale sources', () => {
    const worker = read('worker.js');
    for (const constName of ['INDEX_HTML', 'INDEX_EN_HTML', 'INDEX_JA_HTML']) {
      const locale = extractLocale(worker, constName);
      expect(locale).not.toContain('>logout<');
      expect(locale).not.toContain('Connection closed.');
    }
  });

  test('footer keeps the build/source colophon line', () => {
    const ko = read('index.html');
    expect(ko).toContain('footer-build');
    expect(ko).toContain('BUILD_VERSION_PLACEHOLDER');
  });
});
