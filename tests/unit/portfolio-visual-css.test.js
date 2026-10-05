const fs = require('fs');
const path = require('path');

describe('portfolio visual CSS contract', () => {
  const portfolioDir = path.join(__dirname, '../../apps/portfolio');
  const stylesDir = path.join(portfolioDir, 'src/styles');

  const readStyle = (fileName) => fs.readFileSync(path.join(stylesDir, fileName), 'utf8');
  const styleFiles = fs.readdirSync(stylesDir).filter((fileName) => fileName.endsWith('.css'));
  const mediaBlock = (css, query) => {
    const start = css.indexOf(`@media ${query}`);
    return start === -1 ? '' : css.slice(start);
  };

  test('S1 desktop hero renders with a layered atmospheric backdrop', () => {
    const variablesCss = readStyle('variables.css');
    const baseCss = readStyle('base.css');
    const heroCss = readStyle('hero.css');

    expect(variablesCss).toContain('--gradient-page-atmosphere');
    expect(variablesCss).toContain(
      'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 44%, var(--bg-primary) 100%);'
    );
    expect(baseCss).toContain('background: var(--gradient-page-atmosphere);');
    expect(heroCss).toContain('.section-hero::before');
    expect(heroCss).toContain('var(--glass-border)');
    expect(heroCss).toContain('isolation: isolate;');
  });

  test('S2 mobile hero keeps CTAs readable and preserves title scale', () => {
    const heroCss = readStyle('hero.css');
    const heroLayoutCss = readStyle('hero-layout.css');

    expect(heroCss).toContain('text-wrap: balance;');
    expect(mediaBlock(heroCss, '(max-width: 640px)')).toMatch(
      /\.hero-title\s*{\s*font-size: var\(--text-5xl\);/
    );
    expect(mediaBlock(heroLayoutCss, '(max-width: 640px)')).toMatch(
      /\.hero-cta\s*{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/
    );
  });

  test('S3 contact links remain plain anchors but gain card affordance', () => {
    const surfacesCss = readStyle('surfaces.css');
    const contactCss = readStyle('contact.css');

    expect(surfacesCss).toMatch(
      /\.contact-item\s*\)\s*{[^}]*border: 1px solid var\(--border-subtle\);/
    );
    expect(contactCss).toMatch(
      /\.contact-item:hover::before\s*{\s*transform: translateX\(var\(--space-1\)\);/
    );
  });

  test('S4 hero proof list is one column on phones and two columns with a lead item above', () => {
    const proofCss = readStyle('hero-proof.css');

    expect(proofCss).toMatch(/\.hero-proof-list\s*{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    const wide = mediaBlock(proofCss, '(min-width: 641px)');
    expect(wide).toMatch(
      /\.hero-proof-list\s*{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/
    );
    expect(wide).toMatch(/\.hero-proof-list li:first-child\s*{\s*grid-column: 1 \/ -1;/);
  });

  test('S5 body keeps an opaque background-color base under the gradient (WCAG contrast)', () => {
    // The atmospheric gradient lives in `background` (an image), which makes
    // getComputedStyle().backgroundColor transparent. Keep an explicit opaque
    // base color so ancestor background-color resolution (and contrast tools)
    // see a solid backdrop behind light hero text.
    const baseCss = readStyle('base.css');
    const bodyRule = baseCss.match(/\bbody\s*{[^}]*}/);
    expect(bodyRule).toBeTruthy();
    expect(bodyRule[0]).toContain('background-color: var(--bg-primary);');
  });

  test('S6 reveal hidden state is gated on reveal-ready (fail-open enhancement)', () => {
    // The hidden state must apply ONLY after ui.js confirms the reveal system
    // initialized (it adds `reveal-ready`). If main.js/ui.js fails, is delayed,
    // or IntersectionObserver is unsupported, the class is never added and all
    // content stays visible. Gating on a synchronous `html.js` flag is NOT
    // enough: JS-enabled-but-app-JS-failed would re-hide content forever.
    const animationsCss = readStyle('animations.css');
    expect(animationsCss).toContain('.reveal-ready .reveal {');
    // No hidden rule may be gated on `.js` (the app-JS-failure trap).
    expect(animationsCss).not.toMatch(/\.js\s+\.reveal\s*{[^}]*opacity:\s*0/);
    // No unscoped `.reveal { ... opacity: 0 }` rule may exist either.
    const unscopedReveal = animationsCss.match(/^\.reveal\s*{[^}]*}/m);
    expect(unscopedReveal && /opacity:\s*0/.test(unscopedReveal[0])).toBeFalsy();
  });

  test('S7 reveal-stagger hidden state is gated on reveal-ready', () => {
    const animationsCss = readStyle('animations.css');
    expect(animationsCss).toContain('.reveal-ready .reveal-stagger > * {');
    expect(animationsCss).not.toMatch(/\.js\s+\.reveal-stagger\s*>\s*\*\s*{[^}]*opacity:\s*0/);
    const unscopedStagger = animationsCss.match(/^\.reveal-stagger\s*>\s*\*\s*{[^}]*}/m);
    expect(unscopedStagger && /opacity:\s*0/.test(unscopedStagger[0])).toBeFalsy();
  });

  test('S8 revealed state outranks the hidden state regardless of rule order', () => {
    // `.reveal-ready .reveal` and `.reveal-ready .reveal.revealed` differ by one
    // class (0-3-0 vs 0-2-0), so revealed always wins independent of order.
    const animationsCss = readStyle('animations.css');
    expect(animationsCss).toMatch(/\.reveal-ready\s+\.reveal\.revealed\s*{[^}]*opacity:\s*1/);
    expect(animationsCss).toMatch(
      /\.reveal-ready\s+\.reveal-stagger\.revealed\s*>\s*\*\s*{[^}]*opacity:\s*1/
    );
  });

  test('S9 lang-switcher links meet 44px target size and have a focus-visible ring', () => {
    // WCAG 2.5.5 target size + 2.4.7 focus visible for keyboard nav.
    const headerCss = readStyle('site-header.css');
    const langLink = headerCss.match(/\.lang-link\s*{[^}]*}/);
    expect(langLink).toBeTruthy();
    expect(langLink[0]).toMatch(/min-height:\s*44px/);
    expect(headerCss).toMatch(/\.lang-link:focus-visible\s*{[^}]*outline/);
  });

  test('S10 about-content uses a readable line measure (<= 75ch), not an over-wide block', () => {
    // Layout BP (web.dev typography): prose line length 45-75ch is the readable
    // window; 900px lets long Korean lines run far past that, hurting scanability.
    const aboutCss = readStyle('about.css');
    const aboutContent = aboutCss.match(/\.about-content\s*{[^}]*}/);
    expect(aboutContent).toBeTruthy();
    const m = aboutContent[0].match(/max-width:\s*(\d+)ch/);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeLessThanOrEqual(75);
    expect(Number(m[1])).toBeGreaterThanOrEqual(45);
  });

  test('S11 about-grid pairs narrative + expertise in 2 columns on desktop, 1 on mobile', () => {
    const aboutCss = readStyle('about.css');
    const aboutGrid = aboutCss.match(/\.about-grid\s*{[^}]*}/);
    expect(aboutGrid).toBeTruthy();
    expect(aboutGrid[0]).toMatch(/display:\s*grid/);
    expect(aboutGrid[0]).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    // Inside its grid column the narrative fills the column instead of keeping
    // the standalone 70ch cap, which would leave an empty gutter.
    const scopedAbout = aboutCss.match(/\.about-grid\s+\.about-content\s*{[^}]*}/);
    expect(scopedAbout).toBeTruthy();
    expect(scopedAbout[0]).toMatch(/max-width:\s*none/);
    expect(mediaBlock(aboutCss, '(max-width: 768px)')).toMatch(
      /\.about-grid\s*{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
  });

  test('S12 the page shell stays centered at every width', () => {
    // A mobile `.page-shell { margin: 0 }` override once pinned the column to
    // the left edge with a 24px gap on the right.
    const layoutCss = readStyle('layout.css');
    expect(layoutCss).toMatch(/\.page-shell\s*{[^}]*margin-inline:\s*auto/);
    for (const fileName of styleFiles.filter((name) => name !== 'print.css')) {
      const css = readStyle(fileName);
      expect(css).not.toMatch(/\.page-shell\s*{[^}]*\bmargin(?:-left|-right|-inline)?:\s*0\b/);
    }
  });

  test('S13 case-study cards only start hidden when motion is allowed', () => {
    // Reduced motion removes the entrance animation, so a hidden starting state
    // outside the no-preference query would leave the cards invisible.
    const gridCss = readStyle('project-case-study-grid.css');
    const motionStart = gridCss.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(motionStart).toBeGreaterThan(-1);
    expect(gridCss.slice(0, motionStart)).not.toMatch(/opacity:\s*0\b/);
  });

  test('S14 every referenced custom property is defined', () => {
    // Undefined tokens fail silently: the declaration is dropped and the
    // surface renders without its background or border.
    const runtimeProperties = new Set(['--scroll-progress', '--level-color']);
    const allCss = styleFiles.map(readStyle).join('\n');
    const defined = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
    const referenced = new Set(
      [...allCss.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
    );
    const undefinedProperties = [...referenced].filter(
      (name) => !defined.has(name) && !runtimeProperties.has(name)
    );
    expect(undefinedProperties).toEqual([]);
  });
});
