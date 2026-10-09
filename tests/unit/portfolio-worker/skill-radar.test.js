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
  };
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}

async function mount(locale, withGrid = true) {
  const grid = fakeElement('div');
  const document = {
    documentElement: { lang: locale },
    getElementById: (id) => (withGrid && id === 'skill-radar-grid' ? grid : null),
    createElement: fakeElement,
    createElementNS: (_namespace, tag) => fakeElement(tag),
  };
  const context = vm.createContext({ document });
  const data = new vm.SourceTextModule(read('skill-radar-data.js'), { context });
  const formatting = new vm.SourceTextModule(read('project-card-formatting.js'), { context });
  const radar = new vm.SourceTextModule(read('skill-radar.js'), { context });
  await radar.link((specifier) => (specifier.includes('skill-radar-data') ? data : formatting));
  await radar.evaluate();
  radar.namespace.initSkillRadar();
  return { grid, domains: data.namespace.resolveSkillData() };
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

    walk(grid, (node) => {
      expect(node.attributes?.role).toBeUndefined();
      expect(node.attributes?.['aria-expanded']).toBeUndefined();
      expect(node.hidden).toBeUndefined();
      expect(node.className || '').not.toMatch(
        /skill-panel|skill-evidence|__expand|level-indicator/
      );
    });
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
