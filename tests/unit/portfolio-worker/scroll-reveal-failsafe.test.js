/**
 * Fail-SAFE scroll-reveal tests (beyond the existing fail-OPEN behavior).
 *
 * Problem: when IntersectionObserver works but its callback lags (fast scroll,
 * full-page screenshot, throttled main thread), `.reveal` sections stay at
 * opacity:0 and the page looks blank/"잘린". The reveal must:
 *  - reveal elements already in/above the viewport immediately at init
 *  - force-reveal any still-pending element after a bounded safety timeout
 *  - keep the reduced-motion path (reveal all, no reveal-ready) unchanged
 *
 * Jest runs in node (no jsdom) so we model a tiny fake DOM.
 */

function makeEl({ top = 0, bottom = 0 } = {}) {
  const classes = new Set();
  return {
    _rect: { top, bottom },
    getBoundingClientRect() {
      return this._rect;
    },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
  };
}

function installFakeDom({ reducedMotion = false, ioWorks = true } = {}) {
  const htmlClasses = new Set();
  const observed = [];
  let ioCallback = null;

  global.window = {
    innerHeight: 800,
    matchMedia: (q) => ({ matches: reducedMotion && /reduced-motion/.test(q) }),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
  global.document = {
    documentElement: {
      classList: {
        add: (c) => htmlClasses.add(c),
        remove: (c) => htmlClasses.delete(c),
        contains: (c) => htmlClasses.has(c),
      },
    },
  };
  if (ioWorks) {
    global.IntersectionObserver = class {
      constructor(cb) {
        ioCallback = cb;
      }
      observe(el) {
        observed.push(el);
      }
      unobserve() {}
      disconnect() {}
    };
  } else {
    delete global.IntersectionObserver;
  }
  return { htmlClasses, observed, triggerIO: (entries) => ioCallback && ioCallback(entries) };
}

describe('scroll-reveal fail-safe', () => {
  let initScrollReveal;
  beforeAll(async () => {
    ({ initScrollReveal } = await import('../../../apps/portfolio/src/scripts/modules/ui.js'));
  });
  afterEach(() => {
    jest.useRealTimers();
    delete global.window;
    delete global.document;
    delete global.IntersectionObserver;
  });

  test('A-S1: reveals in-viewport and above-viewport sections during init (no scroll needed)', () => {
    installFakeDom({ ioWorks: true });
    const inView = makeEl({ top: 100, bottom: 700 }); // within 0..800
    const above = makeEl({ top: -500, bottom: -100 }); // scrolled past
    const below = makeEl({ top: 1500, bottom: 2200 }); // off-screen below
    const els = [inView, above, below];
    initScrollReveal({ root: { querySelectorAll: () => els } });
    expect(inView.classList.contains('revealed')).toBe(true);
    expect(above.classList.contains('revealed')).toBe(true);
    // below-viewport stays hidden until it scrolls in (normal fade preserved)
    expect(below.classList.contains('revealed')).toBe(false);
  });

  test('A-S2: fail-safe timer reveals every pending element if IO callback never fires', () => {
    jest.useFakeTimers();
    installFakeDom({ ioWorks: true });
    const below = makeEl({ top: 1500, bottom: 2200 });
    initScrollReveal({ root: { querySelectorAll: () => [below] } });
    expect(below.classList.contains('revealed')).toBe(false); // hidden initially
    jest.advanceTimersByTime(4000); // safety window elapses, IO never fired
    expect(below.classList.contains('revealed')).toBe(true); // force-revealed
  });

  test('A-S3: reduced-motion reveals all immediately and does not add reveal-ready', () => {
    const { htmlClasses } = installFakeDom({ reducedMotion: true });
    const el = makeEl({ top: 1500, bottom: 2200 });
    initScrollReveal({ root: { querySelectorAll: () => [el] } });
    expect(el.classList.contains('revealed')).toBe(true);
    expect(htmlClasses.has('reveal-ready')).toBe(false);
  });
});
