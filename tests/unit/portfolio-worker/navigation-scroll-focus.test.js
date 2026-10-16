const path = require('path');

const MODULES = path.resolve(__dirname, '../../../apps/portfolio/src/scripts/modules');
const load = (name) => import(path.join(MODULES, name));

class FakeElement {}

function fakeWindow({ reduced = false } = {}) {
  const state = { reduced, scrollCalls: [], pushed: [], location: { hash: '' } };
  global.Element = FakeElement;
  global.window = {
    pageYOffset: 100,
    location: state.location,
    matchMedia: (query) => ({ matches: state.reduced && /reduced-motion/.test(query) }),
    scrollTo: (options) => state.scrollCalls.push(options),
    history: { pushState: (_s, _t, hash) => state.pushed.push(hash) },
  };
  return state;
}

function fakeDocument(targets) {
  const handlers = {};
  global.document = {
    addEventListener: (type, handler) => {
      handlers[type] = handler;
    },
    getElementById: (id) => targets[id] || null,
  };
  return handlers;
}

function fakeTarget({ tabIndex = -1, top = 500 } = {}) {
  const attributes = {};
  return {
    tabIndex,
    focusCalls: [],
    attributes,
    getBoundingClientRect: () => ({ top }),
    hasAttribute: (name) => name in attributes,
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
    focus(options) {
      this.focusCalls.push(options);
    },
  };
}

function fakeClick(href, overrides = {}) {
  const link = Object.assign(new FakeElement(), {
    target: '',
    getAttribute: (name) => (name === 'href' ? href : null),
  });
  const origin = Object.assign(new FakeElement(), { closest: () => link });
  const event = {
    button: 0,
    defaultPrevented: false,
    target: origin,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...overrides,
  };
  return event;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.Element;
});

describe('preferredScrollBehavior', () => {
  test('is smooth by default and auto under reduced motion, evaluated per call', async () => {
    const { preferredScrollBehavior } = await load('scroll-behavior.js');
    const state = fakeWindow();
    expect(preferredScrollBehavior()).toBe('smooth');
    state.reduced = true;
    expect(preferredScrollBehavior()).toBe('auto');
    state.reduced = false;
    expect(preferredScrollBehavior()).toBe('smooth');
  });

  test('falls back to smooth when matchMedia is unavailable', async () => {
    const { preferredScrollBehavior } = await load('scroll-behavior.js');
    global.window = {};
    expect(preferredScrollBehavior()).toBe('smooth');
  });
});

describe('initAnchorScroll', () => {
  async function setup(options) {
    const { initAnchorScroll } = await load('anchor-scroll.js');
    const state = fakeWindow(options);
    const main = fakeTarget();
    const interactive = fakeTarget({ tabIndex: 0 });
    const handlers = fakeDocument({ 'main-content': main, projects: interactive });
    initAnchorScroll();
    return { state, main, interactive, click: handlers.click };
  }

  test('scrolls with the header offset, updates the hash and focuses the destination', async () => {
    const { state, main, click } = await setup();
    const event = fakeClick('#main-content');
    click(event);

    expect(event.defaultPrevented).toBe(true);
    expect(state.scrollCalls).toEqual([{ top: 520, behavior: 'smooth' }]);
    expect(state.pushed).toEqual(['#main-content']);
    expect(main.attributes.tabindex).toBe('-1');
    expect(main.focusCalls).toEqual([{ preventScroll: true }]);
  });

  test('uses auto behaviour when reduced motion is requested at click time', async () => {
    const { state, click } = await setup();
    state.reduced = true;
    click(fakeClick('#main-content'));
    expect(state.scrollCalls[0].behavior).toBe('auto');
  });

  test('leaves natively focusable destinations without a tabindex', async () => {
    const { interactive, click } = await setup();
    click(fakeClick('#projects'));
    expect(interactive.attributes.tabindex).toBeUndefined();
    expect(interactive.focusCalls).toHaveLength(1);
  });

  test('does not push the hash twice for the current fragment', async () => {
    const { state, click } = await setup();
    state.location.hash = '#main-content';
    click(fakeClick('#main-content'));
    expect(state.pushed).toEqual([]);
  });

  test.each([
    ['modified click', { ctrlKey: true }],
    ['secondary button', { button: 1 }],
    ['already handled', { defaultPrevented: true }],
  ])('ignores a %s', async (_label, overrides) => {
    const { state, main, click } = await setup();
    click(fakeClick('#main-content', overrides));
    expect(state.scrollCalls).toEqual([]);
    expect(main.focusCalls).toEqual([]);
  });

  test('ignores fragments without a destination so the browser keeps control', async () => {
    const { state, click } = await setup();
    const event = fakeClick('#missing');
    click(event);
    expect(event.defaultPrevented).toBe(false);
    expect(state.scrollCalls).toEqual([]);
  });
});

describe('cover-letter overlap', () => {
  const rect = (left, top, right, bottom) => ({
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  });

  function install({ section, texts = [] }) {
    global.document = {
      querySelector: (selector) => (selector === '#cover-letter' ? section : null),
    };
    if (section) section.querySelectorAll = () => texts;
  }

  const control = { getBoundingClientRect: () => rect(300, 700, 344, 744) };
  const box = (rectangle) => ({ getBoundingClientRect: () => rectangle });

  test('is true only when the control box meets a visible text box', async () => {
    const { overlapsCoverLetterText } = await load('cover-letter-overlap.js');
    const section = box(rect(0, 0, 390, 2000));
    install({ section, texts: [box(rect(16, 650, 340, 800))] });
    expect(overlapsCoverLetterText(control)).toBe(true);

    install({ section, texts: [box(rect(16, 650, 200, 800))] });
    expect(overlapsCoverLetterText(control)).toBe(false);

    install({ section, texts: [box(rect(0, 0, 0, 0))] });
    expect(overlapsCoverLetterText(control)).toBe(false);
  });

  test('is false when the section is absent or outside the control rows', async () => {
    const { overlapsCoverLetterText } = await load('cover-letter-overlap.js');
    install({ section: null });
    expect(overlapsCoverLetterText(control)).toBe(false);
    install({ section: box(rect(0, 0, 390, 400)), texts: [box(rect(16, 650, 340, 800))] });
    expect(overlapsCoverLetterText(control)).toBe(false);
  });

  test('onCoverLetterResize observes the section when ResizeObserver exists', async () => {
    const { onCoverLetterResize } = await load('cover-letter-overlap.js');
    const observed = [];
    global.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(element) {
        observed.push([element, this.callback]);
      }
    };
    const section = box(rect(0, 0, 1, 1));
    install({ section });
    const callback = () => {};
    onCoverLetterResize(callback);
    expect(observed).toEqual([[section, callback]]);
    delete global.ResizeObserver;
  });
});
