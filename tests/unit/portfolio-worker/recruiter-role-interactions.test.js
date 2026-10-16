const fs = require('fs');
const path = require('path');
const { createFakeElement, createFakeDocument } = require('../../helpers/fake-dom');

const STYLES_DIR = path.resolve(__dirname, '../../../apps/portfolio/src/styles');
const MODULES = '../../../apps/portfolio/src/scripts/modules';

let ROLE_IDS;
let PROOF_COUNT_TWO_LABEL;

function makeCard({ id, role = '', collapsed = false, left = 0, visible = true }) {
  const card = createFakeElement('li');
  card.id = id;
  card.className = collapsed ? 'project-item project-item--collapsed' : 'project-item';
  if (role) card.setAttribute('data-role', role);
  card.rect = { left, top: 0, width: visible ? 100 : 0, height: 100 };
  card.appendChild(createFakeElement('div')).className = 'project-header';
  return card;
}

function makeChip({ role, label }) {
  const chip = createFakeElement('button');
  chip.disabled = true;
  chip.setAttribute('data-role-filter', role);
  chip.setAttribute('aria-pressed', 'false');
  const labelNode = createFakeElement('span');
  labelNode.className = 'role-chip__label';
  labelNode.textContent = label;
  chip.appendChild(labelNode);
  return chip;
}

function installFakeDom({
  lang = 'ko',
  scrollWidth = 600,
  clientWidth = 600,
  initialScrollLeft = 0,
  reducedMotion = false,
} = {}) {
  const cards = [
    makeCard({ id: 'card-0', role: ROLE_IDS[1], left: 0 }),
    makeCard({ id: 'card-1', role: `${ROLE_IDS[0]} ${ROLE_IDS[3]}`, left: 120 }),
    makeCard({ id: 'card-2', role: ROLE_IDS[2], left: 240 }),
    makeCard({ id: 'card-3', role: ROLE_IDS[0], collapsed: true, left: 360 }),
    makeCard({ id: 'card-4', role: `${ROLE_IDS[3]} ${ROLE_IDS[1]}`, collapsed: true, left: 480 }),
  ];
  const list = createFakeElement('ul');
  list.id = 'project-list';
  list.scrollWidth = scrollWidth;
  list.clientWidth = clientWidth;
  list.scrollLeft = initialScrollLeft;
  list.rect = { left: 0, top: 0, width: 600, height: 400 };
  list.scrollTo = jest.fn(({ left }) => {
    if (typeof left === 'number') list.scrollLeft = left;
  });
  cards.forEach((card) => list.appendChild(card));

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

  global.getComputedStyle = () => ({
    getPropertyValue: (name) =>
      ({ '--duration-base': '200ms', '--ease-out': 'ease-out' })[name] || '',
  });
  global.window = {
    location: { href: 'https://resume.example.com/', hash: '' },
    history,
    matchMedia: () => ({ matches: reducedMotion }),
  };
  global.document = {
    ...createFakeDocument({ lang }),
    querySelectorAll: (selector) => (selector === '.role-chip' ? chips : []),
    querySelector: (selector) =>
      selector === '[data-role-status]'
        ? status
        : selector === '#projects'
          ? projectsSection
          : null,
  };
  const proofCounts = new Map([
    [ROLE_IDS[0], 2],
    [ROLE_IDS[3], 2],
    [ROLE_IDS[1], 2],
    [ROLE_IDS[2], 1],
  ]);
  return { cards, list, chips, status, projectsSection, history, proofCounts };
}

const ids = (list) => list.children.map((card) => card.id);
const badgeOf = (card) => card.querySelector('.project-role-badge');

describe('recruiter-role-interactions module', () => {
  let bindRoleControls;

  beforeAll(async () => {
    ({ bindRoleControls } = await import(`${MODULES}/recruiter-role-interactions.js`));
    const { getRoleProfiles, getProofCountLabel } = await import(
      `${MODULES}/recruiter-enhancements-data.js`
    );
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
    delete global.getComputedStyle;
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
    expect(ids(list)).toEqual(['card-1', 'card-3', 'card-0', 'card-2', 'card-4']);

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
    expect(ids(list)).toEqual(['card-1', 'card-3', 'card-0', 'card-2', 'card-4']);

    chips[1].click();
    expect(chips[0].getAttribute('aria-pressed')).toBe('false');
    expect(chips[1].getAttribute('aria-pressed')).toBe('true');
    expect(ids(list)).toEqual(['card-1', 'card-4', 'card-0', 'card-2', 'card-3']);
    expect(cards.map((card) => card.getAttribute('data-original-index'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);

    chips[1].click();
    expect(chips.map((chip) => chip.getAttribute('aria-pressed'))).toEqual(['false', 'false']);
    expect(ids(list)).toEqual(['card-0', 'card-1', 'card-2', 'card-3', 'card-4']);
    for (const card of cards) {
      expect(card.classList.contains('is-role-match')).toBe(false);
      expect(card.classList.contains('is-role-dimmed')).toBe(false);
      expect(badgeOf(card)).toBeNull();
    }
    expect(status.textContent).toBe('');
    expect(history.replaceState).toHaveBeenCalledTimes(1);
    expect(history.state.selectedRole).toBeUndefined();
    expect(history.state.existingKey).toBe('preserved');
  });

  test.each([
    ['ko', '역할 일치'],
    ['en', 'Role match'],
    ['ja', 'ロール一致'],
  ])(
    '%s matched cards carry a glyph-and-label badge that is removed when the filter clears',
    (lang, label) => {
      const { cards, chips, proofCounts } = installFakeDom({ lang });
      bindRoleControls(cards, proofCounts);

      chips[0].click();
      for (const card of [cards[1], cards[3]]) {
        const badge = badgeOf(card);
        expect(badge.textContent).toBe(label);
        expect(badge.querySelector('svg')).not.toBeNull();
        expect(card.querySelector('.project-header').children[0]).toBe(badge);
      }
      for (const card of [cards[0], cards[2], cards[4]]) expect(badgeOf(card)).toBeNull();

      chips[0].click();
      cards.forEach((card) => expect(badgeOf(card)).toBeNull());
    }
  );

  test('re-selecting does not duplicate badges', () => {
    const { cards, chips, proofCounts } = installFakeDom();
    bindRoleControls(cards, proofCounts);
    chips[0].click();
    chips[1].click();
    chips[0].click();
    expect(cards[1].querySelectorAll('.project-role-badge')).toHaveLength(1);
  });

  test('on phone horizontal snap carousels, reordering and restoring scroll the list back to start', () => {
    const { cards, list, chips, proofCounts } = installFakeDom({
      scrollWidth: 1400,
      clientWidth: 360,
      initialScrollLeft: 280,
    });
    cards[1].rect = { left: 0, top: 0, width: 100, height: 100 };

    bindRoleControls(cards, proofCounts);
    chips[0].click();
    expect(list.scrollLeft).toBe(0);
    expect(list.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });

    list.scrollLeft = 320;
    chips[0].click();
    expect(list.scrollLeft).toBe(0);
    expect(list.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
  });

  test('prefers-reduced-motion switches every role-filter scroll to behavior auto, evaluated at call time', () => {
    const { cards, list, chips, projectsSection, proofCounts } = installFakeDom({
      scrollWidth: 1400,
      clientWidth: 360,
      reducedMotion: true,
    });
    bindRoleControls(cards, proofCounts);
    chips[0].click();
    expect(projectsSection.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'auto',
      block: 'start',
    });
    expect(list.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));

    chips[0].click();
    expect(list.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });

    window.matchMedia = () => ({ matches: false });
    chips[0].click();
    expect(projectsSection.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  test('reordering animates each moved card from its old position and cancels the previous run', () => {
    const { cards, list, chips, proofCounts } = installFakeDom();
    cards.forEach((card) => {
      card.getBoundingClientRect = () => {
        const index = list.children.indexOf(card);
        return { left: index * 120, top: 0, width: 100, height: 100 };
      };
    });
    bindRoleControls(cards, proofCounts);

    chips[0].click();
    const moved = cards.filter((card) => card.animations.length > 0);
    expect(moved.length).toBeGreaterThan(0);
    for (const card of moved) {
      const [{ keyframes }] = card.animations;
      expect(keyframes[1]).toEqual({ transform: 'none' });
      expect(keyframes[0].transform).toMatch(/^translate\(-?\d+(\.\d+)?px, 0px\)$/);
    }

    chips[0].click();
    expect(moved.some((card) => card.animations[0].cancelled)).toBe(true);
  });

  test('reordering is instant under reduced motion', () => {
    const { cards, chips, proofCounts } = installFakeDom({ reducedMotion: true });
    bindRoleControls(cards, proofCounts);
    chips[0].click();
    cards.forEach((card) => expect(card.animations).toHaveLength(0));
  });
});

describe('role-filter stylesheets', () => {
  const css = (name) => fs.readFileSync(path.join(STYLES_DIR, name), 'utf8');

  test('matched cards use a neutral edge and a selected wash, with the dimmed state intact', () => {
    const roleFilterCss = css('project-role-filter.css');
    expect(css('main.css')).toContain(
      "@import './project-more.css';\n@import './project-role-filter.css';"
    );
    expect(roleFilterCss).toMatch(
      /\.project-item\.is-role-match\s*\{[^}]*border-color:\s*var\(--border-control\)/
    );
    expect(roleFilterCss).toMatch(
      /\.project-item\.is-role-match\s*\{[^}]*background-image:\s*linear-gradient\(var\(--accent-wash-2\)/
    );
    expect(roleFilterCss).not.toMatch(/\.is-role-match\s*\{[^}]*(--color-accent[;)]|box-shadow)/);
    expect(roleFilterCss).toMatch(/\.project-role-badge\s*\{/);
    expect(roleFilterCss).toMatch(
      /\.project-item\.is-role-dimmed:not\(:hover\):not\(:focus-within\)\s*\{[^}]*border-color:\s*var\(--border-primary\)[\s\S]*?filter:\s*var\(--filter-dimmed\)/
    );
    expect(css('variables-components.css')).toMatch(/--filter-dimmed:\s*saturate\(0\.25\);/);
    expect(roleFilterCss).not.toMatch(/\.is-role-dimmed:(?:hover|focus-within)/);
    expect(roleFilterCss).not.toMatch(/opacity/);
  });

  test('collapsed projects hide only behind the script-enabled flag, and matched ones stay visible', () => {
    const moreCss = css('project-more.css');
    expect(moreCss).toMatch(
      /html\.js \.project-list:not\(\.is-expanded\) \.project-item--collapsed:not\(\.is-role-match\)\s*\{\s*display:\s*none/
    );
    expect(moreCss).not.toMatch(/^\.project-item--collapsed\s*\{/m);
  });
});
