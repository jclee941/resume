/**
 * Static CSS contract for the visual revamp (answers the "그대로" / unchanged
 * complaint). All assertions read source CSS — they pin that the revamp rules
 * exist while preserving the cyberpunk-terminal brand. CSS is hard to unit-test
 * behaviorally, so these are structural/source assertions (deterministic, fast).
 */

const fs = require('fs');
const path = require('path');

const STYLES = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio', 'src', 'styles');
const read = (f) => fs.readFileSync(path.join(STYLES, f), 'utf-8');

describe('visual revamp: hero atmospheric depth', () => {
  // .section-hero lives in layout.css, so its ::before atmosphere is defined there.
  const layout = read('layout.css');
  test('hero section has an atmospheric ::before gradient layer', () => {
    expect(layout).toMatch(/\.section-hero::before/);
    expect(layout).toMatch(/radial-gradient/);
  });
});

describe('visual revamp: per-section accent rhythm', () => {
  const layout = read('layout.css');
  test('sections carry distinct accent colors (not all cyan)', () => {
    // At least magenta + green accents must appear in section-scoped rules.
    expect(layout).toMatch(/--section-accent/);
    expect(layout).toMatch(/var\(--cyber-magenta\)/);
    expect(layout).toMatch(/var\(--cyber-green\)/);
  });

  test('section-title underline uses the accent and is not overwritten by a cyan-only background', () => {
    const after = layout.slice(
      layout.indexOf('.section-title::after'),
      layout.indexOf('.section-title::after') + 400
    );
    expect(after).toMatch(/background:\s*linear-gradient\([^)]*--section-accent/);
    // No later flat cyan-only override inside the same rule.
    expect(after).not.toMatch(
      /background:\s*linear-gradient\(90deg,\s*var\(--cyber-cyan\),\s*transparent\)/
    );
  });
});

describe('visual revamp: gradient section dividers', () => {
  const layout = read('layout.css');
  test('section divider uses a gradient (border-image), not a flat dashed line', () => {
    expect(layout).toMatch(/border-image/);
  });
});

describe('visual revamp: glow intensified for hierarchy', () => {
  const hero = read('hero.css');
  test('hero title glow is stronger than the old near-invisible 0.12 shadow', () => {
    // Old value was rgba(0,212,224,0.12). Require a stronger glow token or higher alpha.
    expect(hero).not.toMatch(/text-shadow:\s*0 0 30px rgba\(0, 212, 224, 0\.12\)/);
    expect(hero).toMatch(/--glow-cyan-intense|rgba\(0, 212, 224, 0\.(2[5-9]|[3-9]\d?)/);
  });
});

describe('visual revamp: card hover is more tactile', () => {
  const cards = read('cards.css');
  test('card hover lifts more than the old translateY(-2px)', () => {
    expect(cards).toMatch(/\.card:hover[\s\S]*?translateY\(-4px\)/);
  });
});

describe('visual revamp guards: print + reduced-motion', () => {
  const print = read('print.css');
  const anim = read('animations.css');
  test('print stylesheet neutralizes the hero atmospheric layer', () => {
    expect(print).toMatch(/\.section-hero::before[\s\S]*?(display:\s*none|background:\s*none)/);
  });
  test('reduced-motion block still present (covers any new motion)', () => {
    expect(anim).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
