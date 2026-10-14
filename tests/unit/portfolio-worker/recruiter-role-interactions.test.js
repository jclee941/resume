const fs = require('fs');
const path = require('path');

const STYLES_DIR = path.resolve(__dirname, '../../../apps/portfolio/src/styles');

let ROLE_IDS;
let PROOF_COUNT_TWO_LABEL;

function toDatasetKey(attrName) {
  return attrName.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => set.add(name)),
    remove: (...names) => names.forEach((name) => set.delete(name)),
    contains: (name) => set.has(name),
    toArray: () => Array.from(set),
  };
}

function makeCard({ id, role = '', collapsed = false, left = 0, visible = true }) {
  const attrs = { id };
  if (role) attrs['data-role'] = role;
  const dataset = {};
  if (role) dataset.role = role;
  const classes = ['project-item'];
  if (collapsed) classes.push('project-item--collapsed');

  return {
    id,
    dataset,
    parentElement: null,
    classList: makeClassList(classes),
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name, value) {
      const str = String(value);
      attrs[name] = str;
      if (name.startsWith('data-')) {
        dataset[toDatasetKey(name)] = str;
      }
    },
    getClientRects() {
      return visible ? [{ left }] : [];
    },
    getBoundingClientRect() {
      return { left };
    },
  };
}

function makeChip({ role, label }) {
  const listeners = {};
  const attrs = {
    'data-role-filter': role,
    'aria-pressed': 'false',
  };
  return {
    disabled: true,
    dataset: { roleFilter: role },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name, value) {
      attrs[name] = String(value);
    },
    querySelector(selector) {
      if (selector === '.role-chip__label') {
        return { textContent: label };
      }
      return null;
    },
    addEventListener(type, handler) {
      (listeners[type] ||= []).push(handler);
    },
    click() {
      (listeners.click || []).forEach((handler) => handler());
    },
  };
}

function installFakeDom({
  lang = 'ko',
  scrollWidth = 600,
  clientWidth = 600,
  initialScrollLeft = 0,
} = {}) {
  const cards = [
    makeCard({ id: 'card-0', role: ROLE_IDS[1], collapsed: false, left: 0 }),
    makeCard({ id: 'card-1', role: `${ROLE_IDS[0]} ${ROLE_IDS[3]}`, collapsed: false, left: 120 }),
    makeCard({ id: 'card-2', role: ROLE_IDS[2], collapsed: false, left: 240 }),
    makeCard({ id: 'card-3', role: ROLE_IDS[0], collapsed: true, left: 360 }),
    makeCard({ id: 'card-4', role: `${ROLE_IDS[3]} ${ROLE_IDS[1]}`, collapsed: true, left: 480 }),
  ];

  const list = {
    id: 'project-list',
    children: [...cards],
    scrollWidth,
    clientWidth,
    scrollLeft: initialScrollLeft,
    scrollTo: jest.fn(({ left }) => {
      if (typeof left === 'number') list.scrollLeft = left;
    }),
    getBoundingClientRect: () => ({ left: 0 }),
    appendChild(card) {
      const idx = this.children.indexOf(card);
      if (idx !== -1) this.children.splice(idx, 1);
      this.children.push(card);
      card.parentElement = this;
      return card;
    },
  };
  cards.forEach((card) => {
    card.parentElement = list;
  });

  const chips = [
    makeChip({ role: ROLE_IDS[0], label: '보안 엔지니어링' }),
    makeChip({ role: ROLE_IDS[3], label: 'AI 엔지니어링' }),
  ];
  const status = { textContent: '' };
  const projectsSection = { scrollIntoView: jest.fn() };

  const history = {
    state: { existingKey: 'preserved' },
    pushState: jest.fn((state, _unused, url) => {
      history.state = state;
      window.location.href = String(url);
      window.location.hash = new URL(String(url)).hash;
    }),
    replaceState: jest.fn((state, _unused, url) => {
      history.state = state;
      if (url) window.location.href = String(url);
    }),
  };

  global.window = {
    location: {
      href: 'https://resume.example.com/',
      hash: '',
    },
    history,
  };

  global.document = {
    documentElement: { lang },
    querySelectorAll(selector) {
      if (selector === '.role-chip') return chips;
      return [];
    },
    querySelector(selector) {
      if (selector === '[data-role-status]') return status;
      if (selector === '#projects') return projectsSection;
      return null;
    },
  };

  const proofCounts = new Map([
    [ROLE_IDS[0], 2],
    [ROLE_IDS[3], 2],
    [ROLE_IDS[1], 2],
    [ROLE_IDS[2], 1],
  ]);

  return { cards, list, chips, status, projectsSection, history, proofCounts };
}

describe('recruiter-role-interactions module', () => {
  let bindRoleControls;

  beforeAll(async () => {
    ({ bindRoleControls } =
      await import('../../../apps/portfolio/src/scripts/modules/recruiter-role-interactions.js'));
    const { getRoleProfiles, getProofCountLabel } =
      await import('../../../apps/portfolio/src/scripts/modules/recruiter-enhancements-data.js');
    global.document = { documentElement: { lang: 'ko' } };
    const profiles = getRoleProfiles();
    PROOF_COUNT_TWO_LABEL = getProofCountLabel(2);
    delete global.document;
    if (profiles.length < 4) {
      throw new Error(`expected at least 4 role profiles, got ${profiles.length}`);
    }
    ROLE_IDS = profiles.slice(0, 4).map((profile) => profile.id);
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
  });

  test('selecting a role records original indices, reorders matches first, reveals collapsed matches via class, and dims non-matches', () => {
    const { cards, list, chips, status, projectsSection, history, proofCounts } = installFakeDom();
    bindRoleControls(cards, proofCounts);

    expect(cards.map((card) => card.getAttribute('data-original-index'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(chips.every((chip) => chip.disabled === false)).toBe(true);

    chips[0].click();

    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    expect(chips[1].getAttribute('aria-pressed')).toBe('false');

    expect(list.children.map((card) => card.id)).toEqual([
      'card-1',
      'card-3',
      'card-0',
      'card-2',
      'card-4',
    ]);

    const collapsedMatch = cards[3];
    expect(collapsedMatch.classList.contains('project-item--collapsed')).toBe(true);
    expect(collapsedMatch.classList.contains('is-role-match')).toBe(true);
    expect(collapsedMatch.classList.contains('is-role-dimmed')).toBe(false);

    for (const nonMatch of [cards[0], cards[2], cards[4]]) {
      expect(nonMatch.classList.contains('is-role-dimmed')).toBe(true);
      expect(nonMatch.classList.contains('is-role-match')).toBe(false);
    }

    expect(status.textContent).toBe(`보안 엔지니어링 선택됨: ${PROOF_COUNT_TWO_LABEL}`);
    expect(history.pushState).toHaveBeenCalledTimes(1);
    expect(history.state).toMatchObject({
      existingKey: 'preserved',
      selectedRole: ROLE_IDS[0],
      selectedRoleLabel: '보안 엔지니어링',
      projectAnchor: 'projects',
    });
    expect(projectsSection.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  test('switching roles preserves original relative order and pressing the active chip again restores state and DOM order', () => {
    const { cards, list, chips, status, history, proofCounts } = installFakeDom();
    bindRoleControls(cards, proofCounts);

    chips[0].click();
    expect(list.children.map((card) => card.id)).toEqual([
      'card-1',
      'card-3',
      'card-0',
      'card-2',
      'card-4',
    ]);

    chips[1].click();
    expect(chips[0].getAttribute('aria-pressed')).toBe('false');
    expect(chips[1].getAttribute('aria-pressed')).toBe('true');
    expect(list.children.map((card) => card.id)).toEqual([
      'card-1',
      'card-4',
      'card-0',
      'card-2',
      'card-3',
    ]);
    expect(cards.map((card) => card.getAttribute('data-original-index'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);

    chips[1].click();
    expect(chips[0].getAttribute('aria-pressed')).toBe('false');
    expect(chips[1].getAttribute('aria-pressed')).toBe('false');
    expect(list.children.map((card) => card.id)).toEqual([
      'card-0',
      'card-1',
      'card-2',
      'card-3',
      'card-4',
    ]);
    for (const card of cards) {
      expect(card.classList.contains('is-role-match')).toBe(false);
      expect(card.classList.contains('is-role-dimmed')).toBe(false);
    }
    expect(status.textContent).toBe('');
    expect(history.replaceState).toHaveBeenCalledTimes(1);
    expect(history.state.selectedRole).toBeUndefined();
    expect(history.state.selectedRoleLabel).toBeUndefined();
    expect(history.state.existingKey).toBe('preserved');
  });

  test('on phone horizontal snap carousels, reordering and restoring scroll the list back to start', () => {
    const { cards, list, chips, proofCounts } = installFakeDom({
      scrollWidth: 1400,
      clientWidth: 360,
      initialScrollLeft: 280,
    });
    cards[1].getBoundingClientRect = () => ({ left: 0 });

    bindRoleControls(cards, proofCounts);
    chips[0].click();

    expect(list.scrollLeft).toBe(0);
    expect(list.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });

    list.scrollLeft = 320;
    chips[0].click();

    expect(list.scrollLeft).toBe(0);
    expect(list.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
  });

  test('project-role-filter.css and main.css define collapsed match reveal and reduced-motion dimmed state', () => {
    const mainCss = fs.readFileSync(path.join(STYLES_DIR, 'main.css'), 'utf8');
    const roleFilterCss = fs.readFileSync(path.join(STYLES_DIR, 'project-role-filter.css'), 'utf8');

    expect(mainCss).toContain(
      "@import './project-more.css';\n@import './project-role-filter.css';"
    );
    expect(roleFilterCss).toMatch(
      /\.project-item--collapsed\.is-role-match\s*\{[^}]*display:\s*grid/
    );
    expect(roleFilterCss).toMatch(/\.project-item\.is-role-dimmed\s*\{[^}]*opacity:\s*0\.45/);
    expect(roleFilterCss).toMatch(
      /\.project-item\.is-role-dimmed:hover,\s*\.project-item\.is-role-dimmed:focus-within\s*\{[^}]*opacity:\s*1/
    );
    expect(roleFilterCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?transition:\s*opacity\s+var\(--transition-base\)/
    );
    expect(roleFilterCss).not.toMatch(/border/);
  });
});
