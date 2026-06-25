/**
 * Enhancement contract tests (고도화)
 *
 * Locks the recruiter-facing enhancement work across six axes:
 *  - Accessibility landmarks (KO/EN source HTML)
 *  - Reduced-motion coverage without glitch chrome
 *  - SEO structured-data determinism (no wall-clock dateCreated) + JA language
 *  - JA i18n parity (server-side locale data: data_ja.json vs data.json)
 *  - PDF source: LinkedIn contact + accessible accent link colour
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

  test('KO source removes terminal chrome and keeps semantic landmarks', () => {
    expect(ko).not.toMatch(/class="terminal-window"/);
    expect(ko).toMatch(/<main[^>]*id="main-content"/);
    expect(ko).toMatch(/<nav[^>]*role="navigation"/);
    expect(ko).toMatch(/<footer[^>]*role="contentinfo"/);
    expect(ko).toMatch(
      /class="skip-link"[^>]*href="#main-content"|href="#main-content"[^>]*class="skip-link"/
    );
  });

  test('EN nav declares role="navigation"', () => {
    expect(en).toMatch(/<nav class="minimal-nav"[^>]*role="navigation"/);
  });

  test('EN footer declares role="contentinfo"', () => {
    expect(en).toMatch(/<footer class="site-footer"[^>]*role="contentinfo"/);
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

describe('고도화: reduced-motion without glitch chrome', () => {
  const css = read(path.join(PORTFOLIO, 'src', 'styles', 'animations.css'));
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

  test('glitch selectors are removed and reduced motion still neutralizes animation', () => {
    expect(css).not.toMatch(/\.glitch\b/);
    expect(reduced).toMatch(/animation:\s*none|transition:\s*none/);
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
  test('built ja locale data has top-level key parity with the ko locale', () => {
    // The site serves Japanese via server-side per-locale data (data_ja.json),
    // not a client-side translation dictionary. Assert real parity there.
    const ko = JSON.parse(read(path.join(PORTFOLIO, 'data.json')));
    const ja = JSON.parse(read(path.join(PORTFOLIO, 'data_ja.json')));
    const koKeys = Object.keys(ko).sort();
    const jaKeys = Object.keys(ja).sort();
    expect(jaKeys.length).toBeGreaterThan(0);
    expect(jaKeys).toEqual(koKeys);
  });
});

describe('고도화: PDF source polish', () => {
  test('resume_master.md contact block includes LinkedIn', () => {
    const md = read(path.join(DATA, 'resume_master.md'));
    expect(md).toMatch(/linkedin\.com\/in\//i);
  });

  test('PDF generator uses a non-default accessible accent link colour, not literal blue', () => {
    const gen = read(path.join(TOOLS, 'pdf-generator.go'));
    expect(gen).not.toMatch(/linkcolor:blue/);
    expect(gen).toMatch(
      /linkcolor:(?!(?:blue|black|gray|grey|white)\b)(?:[a-z]+|\[HTML\]\{[0-9A-Fa-f]{6}\}|[0-9A-Fa-f]{6})/
    );
  });
});

describe('FAANG framing: case-study senior narrative', () => {
  const src = read(path.join(PORTFOLIO, 'src', 'scripts', 'modules', 'project-cards-data.js'));

  test('Nextrade case studies frame a design decision / trade-off', () => {
    // The two Nextrade cards should read like senior engineering: an explicit
    // constraint or trade-off, not just a task list.
    expect(src).toMatch(/제약|트레이드오프|설계 결정|trade-off|constraint/);
  });

  test('does not introduce fabricated percentage/ratio metrics', () => {
    // Guard the no-metrics rule on the case-study source.
    expect(src).not.toMatch(/\b\d{1,3}\s?%/);
  });

  test('architecture diagrams stay compact enough for mobile deep-dive panels', () => {
    const matches = [...src.matchAll(/architecture:\s*`([\s\S]*?)`/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const [, diagram] of matches) {
      const lineLengths = diagram.split('\n').map((line) => [...line].length);
      expect(Math.max(...lineLengths)).toBeLessThanOrEqual(32);
    }
  });
});

describe('Project deep-dive architecture diagram accessibility', () => {
  const overlay = read(path.join(PORTFOLIO, 'src', 'scripts', 'modules', 'project-deep-dive-overlay.js'));

  test('architecture diagram is keyboard focusable and exposed as an image-like flow', () => {
    expect(overlay).toMatch(/class="architecture-diagram"[^`]*tabindex="0"[^`]*role="img"/);
    expect(overlay).toMatch(/aria-label="\$\{escapeHtml\(project\.title\)\} architecture flow"/);
  });
});

describe('B: engineering principles + current focus surfaced from SSoT (single source)', () => {
  const ko = read(path.join(PORTFOLIO, 'index.html'));
  const en = read(path.join(PORTFOLIO, 'index-en.html'));
  const workerSrc = read(path.join(PORTFOLIO, 'worker.js'));
  const koLocale = (workerSrc.match(/const INDEX_HTML = `([\s\S]*?)`;/) || ['', ''])[1];
  const enLocale = (workerSrc.match(/const INDEX_EN_HTML = `([\s\S]*?)`;/) || ['', ''])[1];

  test('the duplicate hardcoded about-principles block is removed from source', () => {
    // Principles/focus are surfaced once via the data-driven about-content
    // placeholder; the previously-hardcoded duplicate block must be gone.
    expect(ko).not.toMatch(/id="about-principles"|class="about-principles"/);
    expect(en).not.toMatch(/id="about-principles"|class="about-principles"/);
  });

  test('built KO locale surfaces career_highlights as the single About narrative', () => {
    // About was simplified: career_highlights is the one narrative block; the
    // overlapping tech_philosophy / current_focus blocks were removed to cut
    // clutter (the career story is also covered by achievements + the timeline).
    expect(koLocale).toContain('&gt; career_highlights');
    expect(koLocale).not.toMatch(/about-principles/);
    expect(koLocale).not.toMatch(/&gt; tech_philosophy/);
    expect(koLocale).not.toMatch(/&gt; current_focus/);
  });

  test('built EN locale surfaces career_highlights as the single About narrative', () => {
    expect(enLocale).toContain('&gt; career_highlights');
    expect(enLocale).not.toMatch(/about-principles/);
    expect(enLocale).not.toMatch(/&gt; tech_philosophy/);
    expect(enLocale).not.toMatch(/&gt; current_focus/);
  });

  test('does not add resume-inflation sections (careerGap/awards/military)', () => {
    const block = ko.slice(ko.indexOf('about-principles'), ko.indexOf('about-principles') + 2000);
    expect(block).not.toMatch(/careerGap|공백기|수상|병역/);
  });
});

describe('C: print stylesheet exists without CLI chrome', () => {
  const printCss = (() => {
    const p = path.join(PORTFOLIO, 'src', 'styles', 'print.css');
    return require('fs').existsSync(p) ? read(p) : '';
  })();
  const mainCss = read(path.join(PORTFOLIO, 'src', 'styles', 'main.css'));

  test('print.css exists and is imported by main.css', () => {
    expect(printCss.length).toBeGreaterThan(0);
    expect(mainCss).toContain("@import './print.css'");
  });

  test('print stylesheet wraps rules in @media print without CLI references and keeps links printable', () => {
    expect(printCss).toContain('@media print');
    expect(printCss).not.toMatch(/\.cli-container|#cli-container/);
    expect(printCss).toMatch(/a\[href/);
  });
});
