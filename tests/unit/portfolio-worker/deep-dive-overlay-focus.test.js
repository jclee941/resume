const path = require('path');

const MODULES = path.resolve(__dirname, '../../../apps/portfolio/src/scripts/modules');

const PROJECT = {
  title: 'Synthetic project',
  period: '2026.05 ~ Alpha',
  icon: 'shield',
  stack: ['Python'],
  metrics: [{ value: '3', label: 'Parts' }],
  description: 'Synthetic description.',
  achievements: ['One synthetic achievement'],
  architecture: 'A -> B -> C',
  tools: [{ icon: 'shield', name: 'Tool' }],
};

function makeDom() {
  const focusLog = [];
  const handlers = {};
  const doc = {
    documentElement: { lang: 'en' },
    activeElement: null,
    handlers,
    addEventListener: (type, handler) => {
      handlers[type] = handler;
    },
    createTextNode: (text) => ({ textContent: text, isText: true }),
  };

  const makeEl = (tag) => {
    const classes = new Set();
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      type: '',
      textContent: '',
      dataset: {},
      style: {},
      attributes: {},
      children: [],
      isConnected: true,
      inert: false,
      scrollTop: 0,
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
      },
      get className() {
        return [...classes].join(' ');
      },
      set className(value) {
        classes.clear();
        value
          .split(/\s+/)
          .filter(Boolean)
          .forEach((name) => classes.add(name));
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      append(...nodes) {
        this.children.push(...nodes);
      },
      appendChild(node) {
        this.children.push(node);
        return node;
      },
      replaceChildren(...nodes) {
        this.children = nodes;
      },
      addEventListener() {},
      focus() {
        doc.activeElement = this;
        focusLog.push(this.name || this.className || this.tagName);
      },
      contains: () => true,
      querySelectorAll(selector) {
        const wanted = selector.startsWith('.') ? selector.slice(1) : null;
        const found = [];
        const visit = (node) => {
          if (wanted && node.classList && node.classList.contains(wanted)) found.push(node);
          (node.children || []).forEach(visit);
        };
        visit(this);
        return found;
      },
      querySelector(selector) {
        if (selector === '#deep-dive-content') {
          return this.querySelectorAll('.deep-dive-content').find((n) => n.id) || null;
        }
        return this.querySelectorAll(selector)[0] || null;
      },
    };
    return el;
  };

  doc.createElement = makeEl;
  doc.createElementNS = (_ns, tag) => makeEl(tag);
  doc.body = makeEl('body');
  return { doc, makeEl, focusLog };
}

describe('deep-dive overlay focus lifecycle', () => {
  let dom;
  let overlayApi;
  let launcher;
  const timers = [];

  beforeAll(async () => {
    dom = makeDom();
    global.document = dom.doc;
    global.window = {
      setTimeout: (fn, ms) => timers.push({ fn, ms, cancelled: false }),
      clearTimeout: (id) => {
        timers[id - 1].cancelled = true;
      },
    };
    const { createDeepDiveOverlay } = await import(
      path.join(MODULES, 'project-deep-dive-overlay.js')
    );
    overlayApi = createDeepDiveOverlay();
  });

  afterAll(() => {
    delete global.document;
    delete global.window;
  });

  beforeEach(() => {
    dom.focusLog.length = 0;
    timers.length = 0;
    launcher = dom.makeEl('button');
    launcher.name = 'launcher';
    dom.doc.activeElement = launcher;
  });

  const overlay = () => dom.doc.body.children[0];
  const press = (key) => dom.doc.handlers.keydown({ key, preventDefault() {} });
  const runTimers = () => timers.filter((t) => !t.cancelled).forEach((t) => t.fn());

  test('is inert while closed and interactive while open', () => {
    expect(overlay().inert).toBe(true);
    overlayApi.open(PROJECT);
    expect(overlay().inert).toBe(false);
    press('Escape');
    expect(overlay().inert).toBe(true);
  });

  test('moves focus to the close button once, with no second delayed focus', () => {
    overlayApi.open(PROJECT);
    expect(dom.focusLog).toEqual(['deep-dive-close']);
    runTimers();
    expect(dom.focusLog).toEqual(['deep-dive-close']);
    press('Escape');
  });

  test('closing right after opening cancels pending work and returns focus exactly once', () => {
    overlayApi.open(PROJECT);
    press('Escape');
    runTimers();

    expect(dom.focusLog).toEqual(['deep-dive-close', 'launcher']);
    const counters = overlay().querySelectorAll('.metric-card__value');
    expect(counters.length).toBeGreaterThan(0);
    counters.forEach((counter) =>
      expect(counter.classList.contains('animate-counter')).toBe(false)
    );
  });

  test('a reopened dialog ignores the timer of the previous instance', () => {
    overlayApi.open(PROJECT);
    press('Escape');
    overlayApi.open(PROJECT);
    timers[0].cancelled = false;
    timers[0].fn();
    overlay()
      .querySelectorAll('.metric-card__value')
      .forEach((counter) => expect(counter.classList.contains('animate-counter')).toBe(false));
    timers[timers.length - 1].fn();
    overlay()
      .querySelectorAll('.metric-card__value')
      .forEach((counter) => expect(counter.classList.contains('animate-counter')).toBe(true));
    press('Escape');
  });

  test('opening over an open dialog keeps the original launcher for focus return', () => {
    overlayApi.open(PROJECT);
    dom.doc.activeElement = overlay().querySelector('.deep-dive-close');
    overlayApi.open(PROJECT);
    dom.focusLog.length = 0;
    press('Escape');
    expect(dom.focusLog).toEqual(['launcher']);
  });

  test('a localized period word gets its own span while digits stay in the period element', () => {
    overlayApi.open(PROJECT);
    const period = overlay().querySelector('.deep-dive-header__period');
    expect(period.children.map((node) => node.textContent)).toEqual(['2026.05 ~ ', 'Alpha']);
    const word = overlay().querySelector('.deep-dive-header__period-word');
    expect(word.textContent).toBe('Alpha');
    press('Escape');
  });
});
