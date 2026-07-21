/**
 * Static CSS contract for the visual revamp (answers the "그대로" / unchanged
 * complaint). All assertions read source CSS — they pin that the revamp rules
 * express a clean dark-neutral professional layout; no terminal/cyberpunk
 * chrome or neon palette. CSS is hard to unit-test behaviorally, so these are
 * structural/source assertions (deterministic, fast).
 */

const fs = require('fs');
const path = require('path');

const STYLES = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio', 'src', 'styles');
const read = (f) => fs.readFileSync(path.join(STYLES, f), 'utf-8');

describe('visual revamp: hero atmospheric depth', () => {
  const layout = read('layout.css');
  test('hero section does not use glow/radial-gradient atmospheric pseudo-layer', () => {
    expect(layout).not.toMatch(/\.section-hero::before[\s\S]{0,200}radial-gradient/);
  });
});

describe('visual revamp: clean accent and section heading system', () => {
  const layout = read('layout.css');
  const theme = read('variables.css');
  const css = `${theme}\n${layout}`;

  test('neon palette tokens are removed and clean accent token exists', () => {
    expect(css).not.toMatch(/--cyber-magenta|--cyber-green|--glow-/);
    expect(css).toMatch(/--color-accent/);
  });

  test('section headings do not use neon gradient underline', () => {
    expect(layout).not.toMatch(/\.section-title::after[\s\S]{0,200}--cyber-/);
  });
});

describe('visual revamp: subtle neutral section dividers', () => {
  const layout = read('layout.css');
  test('section divider uses a solid neutral border, not a gradient border image', () => {
    expect(layout).toMatch(/1px solid var\(--border/);
    expect(layout).not.toMatch(/border-image[\s\S]{0,200}gradient/);
  });
});

describe('visual revamp: restrained hero typography', () => {
  const hero = read('hero.css');
  test('hero title has no glow or text-shadow', () => {
    const start = hero.indexOf('.hero-title');
    const heroCss = start === -1 ? '' : hero.slice(start, start + 500);
    expect(heroCss).not.toMatch(/text-shadow|--glow-/);
  });
});

describe('visual revamp: non-interactive cards stay still', () => {
  const cards = read('cards.css');
  test('generic cards do not imply an interaction on hover', () => {
    expect(cards).not.toMatch(/\.card:hover/);
  });
});

describe('visual revamp guards: print + reduced-motion', () => {
  const print = read('print.css');
  const anim = read('animations.css');
  test('print stylesheet still exists', () => {
    expect(print).toMatch(/@media print/);
  });
  test('reduced-motion block still present (covers any new motion)', () => {
    expect(anim).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
