/**
 * Section analytics without any scroll-reveal state.
 *
 * Sections render in place at first paint. The shells carry no inline reveal observer and no head
 * bootstrap that hides content, ui.js adds no reveal classes, and ui.js fires one section_view
 * analytics event per section, gated on gtag inside the observer callback so a late gtag still
 * counts. section_view is unified across KO/EN/JA through the shared bundle.
 */

const fs = require('fs');
const path = require('path');

const PORTFOLIO = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio');
const read = (f) => fs.readFileSync(path.join(PORTFOLIO, f), 'utf-8');

describe('scroll-reveal dedup: inline observers removed', () => {
  for (const f of ['index.html', 'index-en.html']) {
    test(`${f} no longer has an inline reveal IntersectionObserver`, () => {
      const html = read(f);
      // The inline reveal block paired an observer with classList.add('revealed').
      expect(html).not.toMatch(
        /new IntersectionObserver[\s\S]{0,400}classList\.add\(\s*['"]revealed['"]\s*\)/
      );
      expect(html).not.toMatch(/querySelectorAll\(\s*['"]\.reveal['"]\s*\)/);
    });
  }
});

describe('ui.js: section analytics without reveal state', () => {
  const ui = read(path.join('src', 'scripts', 'modules', 'ui.js'));
  test('ui.js fires section_view analytics gated on gtag, once per section', () => {
    expect(ui).toMatch(/section_view/);
    expect(ui).toMatch(/typeof window\.gtag|typeof gtag/);
    expect(ui).toMatch(/initSectionAnalytics/);
  });
  test('ui.js adds no reveal classes, so no section waits to be shown', () => {
    expect(ui).not.toMatch(/reveal-ready|classList\.add\(['"]revealed['"]\)/);
  });
});

describe('architecture note: tri-source locale duplication documented', () => {
  test('html-transformer.js documents the KO/EN/JA tri-source contract without debt markers', () => {
    const t = read(path.join('lib', 'html-transformer.js'));
    expect(t).not.toMatch(/\b(TODO|FIXME|HACK|XXX)\b/);
    expect(t).toMatch(/tri-source/);
    expect(t).toMatch(/locale-aware template/);
  });
});

describe('progressive enhancement: no head bootstrap hides sections', () => {
  for (const f of ['index.html', 'index-en.html']) {
    test(`${f} no longer ships a synchronous html.js reveal bootstrap`, () => {
      const html = read(f);
      const headHtml = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
      // No inline head script may add a \`js\` class to gate section visibility.
      expect(headHtml).not.toMatch(/classList\.add\(\s*['"]js['"]\s*\)/);
    });
  }
});
