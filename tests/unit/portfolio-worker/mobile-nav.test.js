/**
 * Mobile navigation bound by ui.js: the toggle opens and closes the menu, keeps aria-expanded and
 * its label in step, and keeps a closing menu laid out (is-collapsing) until its height animation
 * ends. Jest runs in node (no jsdom), so the test models the DOM pieces the module touches and the
 * Web Animations objects it receives.
 */

const flush = () => new Promise((resolve) => setImmediate(resolve));

function makeClassList() {
  const classes = new Set();
  return {
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
    contains: (name) => classes.has(name),
    toggle: (name, force = !classes.has(name)) => {
      if (force) classes.add(name);
      else classes.delete(name);
      return force;
    },
  };
}

// A cancelled animation dispatches cancel instead of finish and rejects its finished promise with
// an AbortError that browsers mark as handled.
function makeAnimation() {
  const listeners = { finish: [], cancel: [] };
  let settle;
  const finished = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  finished.catch(() => {});
  const animation = {
    finished,
    onfinish: null,
    cancelled: false,
    addEventListener: (type, listener) => listeners[type].push(listener),
    finish() {
      if (animation.onfinish) animation.onfinish();
      listeners.finish.forEach((listener) => listener());
      settle.resolve(animation);
    },
    cancel() {
      animation.cancelled = true;
      listeners.cancel.forEach((listener) => listener());
      settle.reject(
        Object.assign(new Error('The animation was cancelled.'), { name: 'AbortError' })
      );
    },
  };
  return animation;
}

function installFakeDom({ reducedMotion = false, bound = false } = {}) {
  const attributes = new Map([
    ['aria-expanded', 'false'],
    ['data-nav-label-open', 'Open navigation'],
    ['data-nav-label-close', 'Close navigation'],
  ]);
  const listeners = { toggle: [], link: [], keydown: [] };
  const toggle = {
    dataset: bound ? { mobileNavBound: 'true' } : {},
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    addEventListener: (type, listener) => listeners.toggle.push(listener),
    focus: jest.fn(),
  };
  const link = { addEventListener: (type, listener) => listeners.link.push(listener) };
  const animations = [];
  const menu = {
    classList: makeClassList(),
    querySelectorAll: () => [link],
    // Closed, the menu is display:none; collapsing, it is laid out at height 0.
    getBoundingClientRect: () => ({ height: menu.classList.contains('open') ? 120 : 0 }),
    animate: () => {
      const animation = makeAnimation();
      animations.push(animation);
      return animation;
    },
  };
  const elements = { '.nav-toggle': toggle, '.nav-links': menu };
  global.window = { matchMedia: () => ({ matches: reducedMotion }) };
  global.document = {
    documentElement: {},
    querySelector: (selector) => elements[selector] ?? null,
    addEventListener: (type, listener) => {
      if (type === 'keydown') listeners.keydown.push(listener);
    },
  };
  global.getComputedStyle = () => ({
    getPropertyValue: (name) => (name === '--duration-base' ? '200ms' : 'ease-out'),
  });
  return {
    toggle,
    menu,
    animations,
    clickToggle: () => listeners.toggle.forEach((listener) => listener()),
    clickLink: () => listeners.link.forEach((listener) => listener()),
    pressKey: (key) => listeners.keydown.forEach((listener) => listener({ key })),
  };
}

describe('mobile navigation', () => {
  let initMobileNav;
  beforeAll(async () => {
    ({ initMobileNav } = await import('../../../apps/portfolio/src/scripts/modules/ui.js'));
  });
  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.getComputedStyle;
  });

  test('the toggle opens the menu, then closes it through the collapsing state', async () => {
    const dom = installFakeDom();
    initMobileNav();

    dom.clickToggle();
    expect(dom.toggle.getAttribute('aria-expanded')).toBe('true');
    expect(dom.toggle.getAttribute('aria-label')).toBe('Close navigation');
    expect(dom.menu.classList.contains('open')).toBe(true);
    expect(dom.menu.classList.contains('is-collapsing')).toBe(false);

    dom.clickToggle();
    expect(dom.toggle.getAttribute('aria-expanded')).toBe('false');
    expect(dom.toggle.getAttribute('aria-label')).toBe('Open navigation');
    expect(dom.menu.classList.contains('open')).toBe(false);
    expect(dom.menu.classList.contains('is-collapsing')).toBe(true);

    dom.animations.at(-1).finish();
    await flush();
    expect(dom.menu.classList.contains('is-collapsing')).toBe(false);
  });

  test('reduced motion opens and closes the menu at once', () => {
    const dom = installFakeDom({ reducedMotion: true });
    initMobileNav();
    dom.clickToggle();
    expect(dom.menu.classList.contains('open')).toBe(true);
    dom.clickToggle();
    expect(dom.menu.classList.contains('open')).toBe(false);
    expect(dom.menu.classList.contains('is-collapsing')).toBe(false);
    expect(dom.animations).toHaveLength(0);
  });

  test('a link closes the menu at once, without the collapsing state or a close animation', () => {
    const dom = installFakeDom();
    initMobileNav();
    dom.clickToggle();
    const started = dom.animations.length;
    dom.clickLink();
    expect(dom.toggle.getAttribute('aria-expanded')).toBe('false');
    expect(dom.toggle.getAttribute('aria-label')).toBe('Open navigation');
    expect(dom.menu.classList.contains('open')).toBe(false);
    expect(dom.menu.classList.contains('is-collapsing')).toBe(false);
    expect(dom.animations).toHaveLength(started);
  });

  test('Escape closes an open menu and returns focus to the toggle', async () => {
    const dom = installFakeDom();
    initMobileNav();
    dom.pressKey('Escape');
    expect(dom.toggle.focus).not.toHaveBeenCalled();

    dom.clickToggle();
    dom.pressKey('Enter');
    expect(dom.menu.classList.contains('open')).toBe(true);

    dom.pressKey('Escape');
    expect(dom.toggle.getAttribute('aria-expanded')).toBe('false');
    expect(dom.menu.classList.contains('is-collapsing')).toBe(true);
    expect(dom.toggle.focus).toHaveBeenCalledTimes(1);

    dom.animations.at(-1).finish();
    await flush();
    expect(dom.menu.classList.contains('is-collapsing')).toBe(false);
  });

  test('reopening during the close animation cancels it and keeps the menu open', async () => {
    const dom = installFakeDom();
    initMobileNav();
    dom.clickToggle();
    dom.clickToggle();
    const closing = dom.animations.at(-1);

    dom.clickToggle();
    expect(closing.cancelled).toBe(true);
    await flush();
    expect(dom.toggle.getAttribute('aria-expanded')).toBe('true');
    expect(dom.menu.classList.contains('open')).toBe(true);
    expect(dom.menu.classList.contains('is-collapsing')).toBe(false);
  });

  test('binds once, and leaves a toggle the page script already bound to that script', () => {
    const dom = installFakeDom();
    initMobileNav();
    initMobileNav();
    dom.clickToggle();
    expect(dom.menu.classList.contains('open')).toBe(true);

    const prebound = installFakeDom({ bound: true });
    initMobileNav();
    prebound.clickToggle();
    expect(prebound.toggle.getAttribute('aria-expanded')).toBe('false');
    expect(prebound.menu.classList.contains('open')).toBe(false);
  });
});
