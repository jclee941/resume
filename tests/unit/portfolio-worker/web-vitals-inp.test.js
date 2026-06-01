/**
 * Source-structure contract for the Web Vitals correctness fix.
 *
 * The client used to record FID (`first-input`), which Google deprecated and
 * replaced with INP in Core Web Vitals (March 2024). The server
 * (lib/metrics/web-vitals.js) already consumes `vitals.inp` but not `fid`, so
 * the old client metric was both deprecated AND unconsumed.
 *
 * web-vitals.js is PerformanceObserver-heavy (no clean pure seam), so this is a
 * static-source assertion that the deprecated path is gone and INP is wired.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'apps',
  'portfolio',
  'src',
  'scripts',
  'modules',
  'web-vitals.js'
);
const src = fs.readFileSync(SRC, 'utf-8');

describe('web-vitals: INP replaces deprecated FID', () => {
  test('no deprecated FID observer remains', () => {
    expect(src).not.toMatch(/observeFID/);
    expect(src).not.toMatch(/'first-input'/);
    expect(src).not.toMatch(/webVitals\.fid/);
  });

  test('an INP observer records webVitals.inp via event-timing', () => {
    expect(src).toMatch(/observeINP/);
    expect(src).toMatch(/type:\s*'event'/);
    expect(src).toMatch(/webVitals\.inp/);
    // INP tracks the LONGEST interaction; require duration usage + a threshold.
    expect(src).toMatch(/\.duration/);
    expect(src).toMatch(/durationThreshold/);
  });

  test('initWebVitals wires observeINP, not observeFID', () => {
    const init = src.slice(src.indexOf('function initWebVitals'));
    expect(init).toMatch(/observeINP\(\)/);
    expect(init).not.toMatch(/observeFID\(\)/);
  });
});

describe('web-vitals: no redundant visibilitychange send', () => {
  test('the once-only visibilitychange listener is removed', () => {
    expect(src).not.toMatch(
      /addEventListener\(\s*'visibilitychange',\s*sendVitals,\s*\{\s*once:\s*true\s*\}\s*\)/
    );
    // The hidden-only listener + pagehide must still cover the send paths.
    expect(src).toMatch(/visibilityState === 'hidden'/);
    expect(src).toMatch(/addEventListener\('pagehide', sendVitals\)/);
  });
});
