const fs = require('fs');
const path = require('path');

describe('portfolio visual CSS contract', () => {
  const portfolioDir = path.join(__dirname, '../../apps/portfolio');
  const stylesDir = path.join(portfolioDir, 'src/styles');

  const readStyle = (fileName) => fs.readFileSync(path.join(stylesDir, fileName), 'utf8');

  test('S1 desktop hero renders with a layered atmospheric backdrop', () => {
    const variablesCss = readStyle('variables.css');
    const baseCss = readStyle('base.css');
    const layoutCss = readStyle('layout.css');

    expect(variablesCss).toContain('--gradient-page-atmosphere');
    expect(variablesCss).toContain(
      'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 44%, var(--bg-primary) 100%);'
    );
    expect(baseCss).toContain('background: var(--gradient-page-atmosphere);');
    expect(layoutCss).toContain('.section-hero::before');
    expect(layoutCss).toContain('var(--glass-border)');
    expect(layoutCss).toContain('isolation: isolate;');
  });

  test('S2 mobile hero keeps CTAs readable and preserves title scale', () => {
    const heroCss = readStyle('hero.css');
    const mediaCss = readStyle('media.css');

    expect(heroCss).toContain('text-wrap: balance;');
    expect(mediaCss).toContain('@media (max-width: 640px)');
    expect(mediaCss).toContain('.hero-title {\n    font-size: var(--text-5xl);');
  });

  test('S3 contact links remain plain anchors but gain card affordance', () => {
    const contactCss = readStyle('contact.css');

    expect(contactCss).toContain('border: 1px solid var(--glass-border);');
    expect(contactCss).toContain('background: var(--glass-bg);');
    expect(contactCss).toContain('transform: translateX(var(--space-1));');
  });

  test('S4 hero proof list groups evidence into a scan-friendly panel', () => {
    const heroCss = readStyle('hero.css');

    expect(heroCss).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(heroCss).toContain('border: 1px solid var(--glass-border);');
    expect(heroCss).toContain('background: var(--glass-bg);');
    expect(heroCss).toContain('.hero-proof-list li:first-child');
    expect(heroCss).toContain('grid-column: 1 / -1;');
    expect(heroCss).toMatch(/\.hero-proof-list\s*{\s*grid-template-columns: 1fr;/);
    expect(heroCss).toMatch(/\.hero-proof-list li:first-child\s*{\s*grid-column: auto;/);
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
    expect(animationsCss).toMatch(/\.reveal-ready\s+\.reveal-stagger\.revealed\s*>\s*\*\s*{[^}]*opacity:\s*1/);
  });
});
