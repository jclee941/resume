const { createFakeDocument, createFakeElement } = require('../../helpers/fake-dom');

const MODULE = '../../../apps/portfolio/src/scripts/modules/skill-radar.js';

async function mount(locale, { withGrid = true, scrollWidth = 0, clientWidth = 0 } = {}) {
  const document = createFakeDocument({ lang: locale });
  const grid = createFakeElement('div');
  grid.scrollWidth = scrollWidth;
  grid.clientWidth = clientWidth;
  grid.focused = false;
  grid.matches = (selector) => selector === ':focus-within' && grid.focused;
  const cards = [createFakeElement('article'), createFakeElement('article')];
  cards.forEach((card) => grid.appendChild(card));
  document.getElementById = (id) => (withGrid && id === 'skill-radar-grid' ? grid : null);
  let observe;
  global.ResizeObserver = class {
    constructor(callback) {
      observe = callback;
    }
    observe() {}
  };
  const resizeListeners = [];
  global.window = {
    addEventListener: (type, handler) => type === 'resize' && resizeListeners.push(handler),
  };
  global.document = document;
  const { initSkillRadar } = await import(MODULE);
  initSkillRadar();
  return {
    grid,
    cards,
    resize(nextScrollWidth, nextClientWidth) {
      grid.scrollWidth = nextScrollWidth;
      grid.clientWidth = nextClientWidth;
      observe();
    },
    blur() {
      grid.focused = false;
      grid.listeners.focusout.forEach((handler) => handler());
    },
  };
}

afterEach(() => {
  delete global.document;
  delete global.window;
  delete global.ResizeObserver;
});

describe('skill radar hydration', () => {
  test('keeps the server-rendered cards: nothing is replaced or rebuilt', async () => {
    const { grid, cards } = await mount('ko');
    expect(grid.children).toEqual(cards);
    expect(grid.children[0].parentElement).toBe(grid);
  });

  test.each([
    ['ko', '기술 스택'],
    ['en', 'Skills'],
    ['ja', 'スキル'],
  ])(
    '%s names the group and adds tabindex only while the grid overflows',
    async (locale, label) => {
      const { grid, resize } = await mount(locale, { scrollWidth: 960, clientWidth: 960 });
      expect(grid.getAttribute('role')).toBe('group');
      expect(grid.getAttribute('aria-label')).toBe(label);
      expect(grid.hasAttribute('tabindex')).toBe(false);
      resize(1280, 390);
      expect(grid.getAttribute('tabindex')).toBe('0');
      resize(1040, 1040);
      expect(grid.hasAttribute('tabindex')).toBe(false);
    }
  );

  test('keeps tabindex while focused and drops it on focusout once nothing overflows', async () => {
    const { grid, resize, blur } = await mount('ko', { scrollWidth: 1280, clientWidth: 390 });
    expect(grid.getAttribute('tabindex')).toBe('0');
    grid.focused = true;
    resize(1040, 1040);
    expect(grid.getAttribute('tabindex')).toBe('0');
    blur();
    expect(grid.hasAttribute('tabindex')).toBe(false);
  });

  test('keeps tabindex after focusout when the grid still overflows', async () => {
    const { grid, blur } = await mount('ko', { scrollWidth: 1280, clientWidth: 390 });
    grid.focused = true;
    blur();
    expect(grid.getAttribute('tabindex')).toBe('0');
  });

  test('pages without the grid do nothing', async () => {
    await expect(mount('ko', { withGrid: false })).resolves.toBeDefined();
  });

  test('the module no longer waits for or reads the resume-data fetch', () => {
    const source = require('fs').readFileSync(
      require.resolve('../../../apps/portfolio/src/scripts/modules/skill-radar.js'),
      'utf8'
    );
    expect(source).not.toMatch(/__RESUME_CHAT_DATA__|resolveSkillData|replaceChildren/);
  });
});
