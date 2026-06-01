/**
 * Characterization tests for the scroll-reveal dedup (architecture cleanup).
 *
 * The inline IntersectionObserver in index.html / index-en.html duplicated the
 * reveal behavior already owned by src/scripts/modules/ui.js. After the cleanup:
 *   - No inline reveal observer remains in either HTML source.
 *   - ui.js stays the single reveal owner and also fires section_view analytics
 *     (gated on gtag, checked inside the observer callback to avoid a load-order
 *     race). INTENTIONAL parity change: section_view was previously KO-only inline;
 *     it is now unified across KO/EN/JA via the shared bundle (both ship gtag).
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

describe('scroll-reveal dedup: ui.js owns reveal + section analytics', () => {
  const ui = read(path.join('src', 'scripts', 'modules', 'ui.js'));
  test('ui.js reveals .reveal elements', () => {
    expect(ui).toMatch(/querySelectorAll\(['"]\.reveal['"]\)/);
    expect(ui).toMatch(/classList\.add\(['"]revealed['"]\)/);
  });
  test('ui.js fires section_view analytics gated on gtag, once per section', () => {
    expect(ui).toMatch(/section_view/);
    expect(ui).toMatch(/typeof window\.gtag|typeof gtag/);
    expect(ui).toMatch(/initSectionAnalytics/);
  });
});

describe('architecture note: tri-source locale duplication documented', () => {
  test('html-transformer.js documents the KO/EN/JA tri-source future refactor', () => {
    const t = read(path.join('lib', 'html-transformer.js'));
    expect(t).toMatch(/ARCHITECTURE TODO/);
    expect(t).toMatch(/tri-source/);
    expect(t).toMatch(/locale-aware template/);
  });
});
