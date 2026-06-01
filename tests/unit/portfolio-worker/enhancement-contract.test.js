/**
 * Enhancement contract tests (고도화)
 *
 * Locks the recruiter-facing enhancement work across six axes:
 *  - Accessibility landmarks (KO/EN source HTML)
 *  - Reduced-motion coverage of the glitch hover effect
 *  - SEO structured-data determinism (no wall-clock dateCreated) + JA language
 *  - JA i18n parity (client translations + chat FAQ)
 *  - PDF source: LinkedIn contact + non-blue (cyan) link colour
 *
 * These are static-source assertions: they read the hand-edited source files
 * (never the generated worker.js) so they stay deterministic and fast.
 */

const fs = require('fs');
const path = require('path');

const PORTFOLIO = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio');
const DATA = path.join(__dirname, '..', '..', '..', 'packages', 'data', 'resumes', 'master');
const TOOLS = path.join(__dirname, '..', '..', '..', 'tools', 'scripts', 'build');

const read = (p) => fs.readFileSync(p, 'utf-8');

describe('고도화: accessibility landmarks', () => {
  const ko = read(path.join(PORTFOLIO, 'index.html'));
  const en = read(path.join(PORTFOLIO, 'index-en.html'));

  test('terminal-window uses role="region", not role="application" (KO)', () => {
    expect(ko).not.toMatch(/class="terminal-window"[^>]*role="application"/);
    expect(ko).toMatch(/class="terminal-window"[^>]*role="region"/);
  });

  test('EN nav declares role="navigation"', () => {
    expect(en).toMatch(/<nav class="minimal-nav"[^>]*role="navigation"/);
  });

  test('EN footer declares role="contentinfo"', () => {
    expect(en).toMatch(/<footer class="site-footer"[^>]*role="contentinfo"/);
  });

  test('tech-filter toolbar references the project list via aria-controls (KO)', () => {
    expect(ko).toMatch(/class="tech-filter-container"[^>]*aria-controls="project-list"/);
    expect(ko).toMatch(/<ul class="project-list"[^>]*id="project-list"/);
  });
});

describe('고도화: SEO hreflang JA', () => {
  test('KO and EN heads both declare a Japanese alternate', () => {
    for (const f of ['index.html', 'index-en.html']) {
      const html = read(path.join(PORTFOLIO, f));
      expect(html).toMatch(
        /hreflang="ja-JP"[^>]*href="https:\/\/resume\.jclee\.me\/ja\/"|hreflang="ja-JP"/
      );
      expect(html).toMatch(/resume\.jclee\.me\/ja\//);
    }
  });
});

describe('고도화: reduced-motion covers glitch hover', () => {
  const css = read(path.join(PORTFOLIO, 'src', 'styles', 'animations.css'));
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

  test('glitch hover pseudo-elements are disabled under reduced motion', () => {
    expect(reduced).toMatch(/\.glitch:hover::before/);
    expect(reduced).toMatch(/\.glitch:hover::after/);
  });
});

describe('고도화: structured-data determinism', () => {
  const src = read(path.join(PORTFOLIO, 'generate-project-schemas.js'));

  test('does not stamp wall-clock dateCreated', () => {
    expect(src).not.toMatch(/dateCreated:\s*new Date\(\)/);
  });

  test('CreativeWork schema advertises Japanese language', () => {
    expect(src).toMatch(/inLanguage:\s*\[[^\]]*'ja'/);
  });
});

describe('고도화: JA i18n parity', () => {
  test('client translations expose a ja block with full key parity', () => {
    // translations.js is an ESM source module; parse it as text to avoid CJS/ESM
    // interop and assert key parity between the ko and ja blocks.
    const src = read(path.join(PORTFOLIO, 'src', 'scripts', 'data', 'translations.js'));
    const blockKeys = (lang) => {
      const start = src.indexOf(`${lang}: {`);
      expect(start).toBeGreaterThan(-1);
      // Slice from the lang block start to the next top-level locale or EOF.
      const rest = src.slice(start + lang.length + 3);
      const end = rest.search(/\n {2}[a-z]{2}: \{|\n\};/);
      const body = end === -1 ? rest : rest.slice(0, end);
      return (body.match(/'([a-zA-Z.]+)':/g) || []).map((m) => m.slice(1, -2)).sort();
    };
    const koKeys = blockKeys('ko');
    const jaKeys = blockKeys('ja');
    expect(jaKeys.length).toBeGreaterThan(0);
    expect(jaKeys).toEqual(koKeys);
  });

  test('chat FAQ provides a Japanese response for every category', () => {
    const chat = read(path.join(PORTFOLIO, 'src', 'scripts', 'modules', 'chat.js'));
    // Each FAQ category currently has responses: [ko, en]; require a 3rd (ja).
    const responseBlocks = chat.match(/responses:\s*\[([\s\S]*?)\]/g) || [];
    expect(responseBlocks.length).toBeGreaterThan(0);
    for (const block of responseBlocks) {
      const entries = (block.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || []).length;
      expect(entries).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('고도화: PDF source polish', () => {
  test('resume_master.md contact block includes LinkedIn', () => {
    const md = read(path.join(DATA, 'resume_master.md'));
    expect(md).toMatch(/linkedin\.com\/in\//i);
  });

  test('PDF generator uses a cyan link colour, not blue', () => {
    const gen = read(path.join(TOOLS, 'pdf-generator.go'));
    expect(gen).not.toMatch(/linkcolor:blue/);
    // Accept a cyan accent expressed as a named colour or an HTML hex model.
    expect(gen).toMatch(/linkcolor:(?:cyan|\[HTML\]\{[0-9A-Fa-f]{6}\}|[0-9A-Fa-f]{6})/);
  });
});
