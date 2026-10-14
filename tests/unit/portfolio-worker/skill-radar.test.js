const fs = require('fs');
const path = require('path');
const vm = require('vm');

const portfolio = path.join(__dirname, '../../../apps/portfolio');
const modules = path.join(portfolio, 'src/scripts/modules');
const read = (file) => fs.readFileSync(path.join(modules, file), 'utf8');

function fakeElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    id: '',
    textContent: '',
    dataset: {},
    attributes: {},
    children: [],
    scrollWidth: 0,
    clientWidth: 0,
    focused: false,
    listeners: {},
    matches(selector) {
      return selector === ':focus-within' && this.focused;
    },
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
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
  };
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}

async function mount(locale, withGrid = true, { scrollWidth = 0, clientWidth = 0 } = {}) {
  const grid = fakeElement('div');
  grid.scrollWidth = scrollWidth;
  grid.clientWidth = clientWidth;
  const resizeListeners = [];
  const observed = [];
  let resizeObserverCallback = null;
  class FakeResizeObserver {
    constructor(callback) {
      resizeObserverCallback = callback;
    }
    observe(target) {
      observed.push(target);
    }
  }
  const window = {
    addEventListener(type, handler) {
      if (type === 'resize') resizeListeners.push(handler);
    },
  };
  const document = {
    documentElement: { lang: locale },
    getElementById: (id) => (withGrid && id === 'skill-radar-grid' ? grid : null),
    createElement: fakeElement,
    createElementNS: (_namespace, tag) => fakeElement(tag),
  };
  const context = vm.createContext({
    document,
    window,
    ResizeObserver: FakeResizeObserver,
  });
  const data = new vm.SourceTextModule(read('skill-radar-data.js'), { context });
  const formatting = new vm.SourceTextModule(read('project-card-formatting.js'), { context });
  const radar = new vm.SourceTextModule(read('skill-radar.js'), { context });
  await radar.link((specifier) => (specifier.includes('skill-radar-data') ? data : formatting));
  await radar.evaluate();
  radar.namespace.initSkillRadar();
  return {
    grid,
    domains: data.namespace.resolveSkillData(),
    observed,
    blurGrid() {
      grid.focused = false;
      (grid.listeners.focusout || []).forEach((handler) => handler());
    },
    triggerResize(nextScrollWidth, nextClientWidth) {
      grid.scrollWidth = nextScrollWidth;
      grid.clientWidth = nextClientWidth;
      if (resizeObserverCallback) resizeObserverCallback();
      resizeListeners.forEach((handler) => handler());
    },
  };
}

describe('skill radar renders every skill as a visible tag', () => {
  test.each(['ko', 'en', 'ja'])(
    '%s shows one card per domain with all of its skills',
    async (locale) => {
      const { grid, domains } = await mount(locale);
      const entries = Object.entries(domains);

      expect(grid.children).toHaveLength(entries.length);
      grid.children.forEach((card, index) => {
        const [key, domain] = entries[index];
        const [header, list] = card.children;
        const title = header.children.find((child) => child.tagName === 'H3');

        expect(card.tagName).toBe('ARTICLE');
        expect(card.className).toBe('skill-domain-card');
        expect(card.dataset.domain).toBe(key);
        expect(title.textContent).toBe(domain.title);
        expect(list.attributes['aria-labelledby']).toBe(title.id);
        expect(list.children.map((item) => item.textContent)).toEqual(
          domain.skills.map((skill) => skill.name)
        );
        expect(list.children.map((item) => item.dataset.skill)).toEqual(
          domain.skills.map((skill) => skill.name)
        );
      });
    }
  );

  test('cards are static: no accordion state, hidden panels, or evidence drawer', async () => {
    const { grid } = await mount('ko');

    for (const card of grid.children) {
      walk(card, (node) => {
        expect(node.attributes?.role).toBeUndefined();
        expect(node.attributes?.['aria-expanded']).toBeUndefined();
        expect(node.hidden).toBeUndefined();
        expect(node.className || '').not.toMatch(
          /skill-panel|skill-evidence|__expand|level-indicator/
        );
      });
    }
  });

  test.each([
    ['ko', '기술 스택'],
    ['en', 'Skills'],
    ['ja', 'スキル'],
  ])(
    '%s sets role="group" with localized aria-label and toggles tabindex="0" only on horizontal overflow',
    async (locale, expectedLabel) => {
      const { grid, observed, triggerResize } = await mount(locale, true, {
        scrollWidth: 960,
        clientWidth: 960,
      });

      expect(grid.attributes.role).toBe('group');
      expect(grid.attributes['aria-label']).toBe(expectedLabel);
      expect(grid.attributes.tabindex).toBeUndefined();
      expect(observed).toEqual([grid]);

      triggerResize(1280, 390);
      expect(grid.attributes.tabindex).toBe('0');

      triggerResize(1040, 1040);
      expect(grid.attributes.tabindex).toBeUndefined();
    }
  );

  test('keeps tabindex while the grid has focus and drops it on focusout once there is no overflow', async () => {
    const { grid, triggerResize, blurGrid } = await mount('ko', true, {
      scrollWidth: 1280,
      clientWidth: 390,
    });
    expect(grid.attributes.tabindex).toBe('0');

    grid.focused = true;
    triggerResize(1040, 1040);
    expect(grid.attributes.tabindex).toBe('0');

    blurGrid();
    expect(grid.attributes.tabindex).toBeUndefined();
  });

  test('keeps tabindex after focusout when the grid still overflows', async () => {
    const { grid, blurGrid } = await mount('ko', true, { scrollWidth: 1280, clientWidth: 390 });
    grid.focused = true;
    blurGrid();
    expect(grid.attributes.tabindex).toBe('0');
  });

  test('marks CJK skill pills with skill-item--cjk while keeping ASCII pills on skill-item', async () => {
    const grid = fakeElement('div');
    const document = {
      documentElement: { lang: 'ko' },
      getElementById: (id) => (id === 'skill-radar-grid' ? grid : null),
      createElement: fakeElement,
      createElementNS: (_namespace, tag) => fakeElement(tag),
    };
    const window = {
      __RESUME_CHAT_DATA__: {
        skills: {
          automation: {
            title: '자동화',
            items: [
              { name: 'Python', level: 'expert' },
              { name: '알림 워크플로', level: 'advanced' },
              { name: '1Password(홈랩 운영)', level: 'intermediate' },
              { name: 'ログ収集', level: 'intermediate' },
            ],
          },
        },
      },
    };
    const context = vm.createContext({ document, window });
    const data = new vm.SourceTextModule(read('skill-radar-data.js'), { context });
    const formatting = new vm.SourceTextModule(read('project-card-formatting.js'), { context });
    const radar = new vm.SourceTextModule(read('skill-radar.js'), { context });
    await radar.link((specifier) => (specifier.includes('skill-radar-data') ? data : formatting));
    await radar.evaluate();
    radar.namespace.initSkillRadar();

    const [, list] = grid.children[0].children;
    expect(list.children.map((item) => [item.textContent, item.className])).toEqual([
      ['Python', 'skill-item'],
      ['알림 워크플로', 'skill-item skill-item--cjk'],
      ['1Password(홈랩 운영)', 'skill-item skill-item--cjk'],
      ['ログ収集', 'skill-item skill-item--cjk'],
    ]);
  });

  test('pages without the grid render nothing', async () => {
    await expect(mount('ko', false)).resolves.toBeDefined();
  });

  test('no skill-search UI remains in the module or the source pages', () => {
    expect(read('skill-radar.js')).not.toMatch(/skill-search|initSkillSearch/);
    expect(fs.existsSync(path.join(modules, 'skill-radar-search.js'))).toBe(false);
    for (const shell of ['index.html', 'index-en.html']) {
      expect(fs.readFileSync(path.join(portfolio, shell), 'utf8')).not.toContain(
        'skill-search-input'
      );
    }
  });
});
