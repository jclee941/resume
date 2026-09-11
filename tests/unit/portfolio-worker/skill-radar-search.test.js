const fs = require('fs');
const path = require('path');
const vm = require('vm');

const modules = path.join(__dirname, '../../../apps/portfolio/src/scripts/modules');
const searchSource = fs.readFileSync(path.join(modules, 'skill-radar-search.js'), 'utf8');
const dataSource = fs.readFileSync(path.join(modules, 'skill-radar-data.js'), 'utf8');

function createCard(title, names) {
  const entries = () => names.map((name) => ({ dataset: { skill: name }, style: {} }));
  const items = entries();
  const evidence = entries();
  return {
    items,
    evidence,
    style: {},
    querySelector: () => ({ textContent: title }),
    querySelectorAll: (selector) => (selector === '.skill-item' ? items : evidence),
  };
}

async function mount(locale = 'ko', missingId) {
  const cards = [
    createCard('Automation', ['Go', 'Python']),
    createCard('Programming', ['Go', 'TypeScript']),
    createCard('Security', ['FortiGate']),
  ];
  const listeners = new Map();
  const input = {
    value: '',
    addEventListener: (event, listener) => listeners.set(event, listener),
  };
  const counter = { textContent: '' };
  const grid = { querySelectorAll: () => cards, appendChild: jest.fn() };
  const elements = {
    'skill-search-input': input,
    'skill-search-count': counter,
    'skill-radar-grid': grid,
  };
  const document = {
    documentElement: { lang: locale },
    getElementById: (id) => (id === missingId ? null : elements[id]),
    createElement: () => ({ hidden: false, textContent: '' }),
  };
  const context = vm.createContext({ document, setTimeout, clearTimeout });
  const data = new vm.SourceTextModule(dataSource, { context });
  const search = new vm.SourceTextModule(searchSource, { context });
  await search.link(() => data);
  await search.evaluate();
  search.namespace.initSkillSearch();
  return {
    cards,
    input,
    counter,
    grid,
    listeners,
    noResults: grid.appendChild.mock.calls[0]?.[0],
    type(value) {
      input.value = value;
      listeners.get('input')();
      jest.advanceTimersByTime(150);
    },
  };
}

describe('skill radar search', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test.each([
    ['ko', '2개 기술 검색됨'],
    ['en', '2 skills found'],
    ['ja', '2件のスキルが見つかりました'],
  ])('%s counts each matching skill once across domains', async (locale, label) => {
    const ui = await mount(locale);
    ui.type(' GO ');
    expect(ui.counter.textContent).toBe(label);
    expect(ui.cards.map((card) => card.style.display)).toEqual(['', '', 'none']);
    for (const card of ui.cards.slice(0, 2)) {
      expect(card.items.map((item) => item.style.display)).toEqual(['', 'none']);
      expect(card.evidence.map((item) => item.style.display)).toEqual(['', 'none']);
    }
  });

  test('domain names retain all skills and corresponding evidence', async () => {
    const ui = await mount();
    ui.type('AUTOMATION');
    expect(ui.counter.textContent).toBe('2개 기술 검색됨');
    expect(ui.cards[0].items.every((item) => item.style.display === '')).toBe(true);
    expect(ui.cards[0].evidence.every((item) => item.style.display === '')).toBe(true);
    expect(ui.cards.slice(1).every((card) => card.style.display === 'none')).toBe(true);
  });

  test.each([
    ['ko', '검색 결과가 없습니다.'],
    ['en', 'No matching skills.'],
    ['ja', '一致するスキルがありません。'],
  ])('%s explains no results and clears the complete filter', async (locale, message) => {
    const ui = await mount(locale);
    ui.type('<no-matching-skill>');
    expect(ui.counter.textContent).toMatch(/^0/);
    expect(ui.noResults.hidden).toBe(false);
    expect(ui.noResults.textContent).toContain(message);
    expect(ui.cards.every((card) => card.style.display === 'none')).toBe(true);
    ui.type('   ');
    expect(ui.counter.textContent).toBe('');
    expect(ui.noResults.hidden).toBe(true);
    for (const card of ui.cards) {
      expect(card.style.display).toBe('');
      expect([...card.items, ...card.evidence].every((item) => item.style.display === '')).toBe(
        true
      );
    }
  });

  test('debounces input and applies only the latest query', async () => {
    const ui = await mount('en');
    ui.input.value = 'Go';
    ui.listeners.get('input')();
    jest.advanceTimersByTime(75);
    ui.input.value = 'Python';
    ui.listeners.get('input')();
    jest.advanceTimersByTime(149);
    expect(ui.counter.textContent).toBe('');
    jest.advanceTimersByTime(1);
    expect(ui.counter.textContent).toBe('1 skill found');
  });

  test.each(['skill-search-input', 'skill-radar-grid'])('ignores pages without %s', async (id) => {
    const ui = await mount('ko', id);
    expect(ui.listeners.size).toBe(0);
    expect(ui.grid.appendChild).not.toHaveBeenCalled();
  });
});
