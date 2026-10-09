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

describe('copy localization: skills section and navigation', () => {
  test('KO source page keeps Korean skills labels and Korean navigation', () => {
    const ko = read('index.html');
    expect(ko).toContain('aria-label="기술 역량 매트릭스"');
    expect(ko).not.toContain('skill-search-input');
    expect(ko).not.toContain('Skill Capability Matrix');
    expect(ko).toMatch(/class="nav-link">경력<\/a>/);
    expect(ko).not.toMatch(/class="nav-link">(about|exp|projects|contact)</);
  });

  test('EN source page uses English navigation without a skills filter', () => {
    const en = read('index-en.html');
    expect(en).not.toContain('Filter skills');
    expect(en).toMatch(/class="nav-link">Experience<\/a>/);
  });

  test('generated JA locale uses Japanese skills and navigation labels', () => {
    const worker = read('worker.js');
    const jaLocale = extractLocale(worker, 'INDEX_JA_HTML');
    expect(jaLocale).toContain('aria-label="スキルマトリクス"');
    expect(jaLocale).toContain('class="nav-link">経歴</a>');
    expect(jaLocale).not.toMatch(/class="nav-link">[가-힣]+</);
    expect(jaLocale).not.toContain('기술 역량');
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
