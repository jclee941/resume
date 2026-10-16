const { createFakeDocument, createFakeElement } = require('../../helpers/fake-dom');

const MODULES = '../../../apps/portfolio/src/scripts/modules';

function el(tag, className, parent) {
  const element = createFakeElement(tag);
  if (className) element.className = className;
  if (parent) parent.appendChild(element);
  return element;
}

function button(parent, className, controls, labels) {
  const node = el('button', className, parent);
  node.setAttribute('aria-expanded', 'false');
  if (controls) node.setAttribute('aria-controls', controls);
  node.dataset.labelClosed = labels[0];
  node.dataset.labelOpen = labels[1];
  node.textContent = labels[0];
  return node;
}

function install(root, overrides = {}, ids = {}) {
  global.document = {
    ...createFakeDocument(),
    getElementById: (id) => ids[id] ?? null,
    querySelector: (selector) => overrides[selector] ?? root.querySelector(selector),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
  };
  global.window = { matchMedia: () => ({ matches: true }) };
}

afterEach(() => {
  delete global.document;
  delete global.window;
});

describe('career timeline binding', () => {
  test('binds the server-rendered list without replacing it, per-role buttons and the earlier-roles button', async () => {
    const root = el('div');
    const timeline = el('ul', 'incident-timeline', root);
    timeline.id = 'career-timeline';
    const ids = {};
    const nodes = [0, 1].map((index) => {
      const node = el('li', 'timeline-node', timeline);
      const card = el('div', 'timeline-card', node);
      const details = el('div', 'timeline-details', card);
      details.id = `details-${index}`;
      ids[details.id] = details;
      return {
        node,
        card,
        details,
        toggle: button(card, 'timeline-expand-btn', details.id, ['Open', 'Close']),
      };
    });
    const older = button(el('div', 'timeline-more', root), 'timeline-more-btn', 'career-timeline', [
      'More',
      'Less',
    ]);
    install(root, {}, ids);
    const { initCareerTimeline } = await import(`${MODULES}/timeline.js`);
    initCareerTimeline();

    expect(nodes.map(({ details }) => details.hasAttribute('aria-hidden'))).toEqual([true, true]);
    expect(root.children[0]).toBe(timeline);
    expect(timeline.children).toEqual(nodes.map(({ node }) => node));

    nodes[1].toggle.click();
    expect(nodes[1].node.classList.contains('is-expanded')).toBe(true);
    expect(nodes[0].node.classList.contains('is-expanded')).toBe(false);
    expect(nodes[1].toggle.getAttribute('aria-expanded')).toBe('true');
    expect(nodes[1].toggle.textContent).toBe('Close');
    expect(nodes[1].details.getAttribute('aria-hidden')).toBe('false');
    expect(nodes[0].details.getAttribute('aria-hidden')).toBe('true');
    nodes[1].toggle.click();
    expect(nodes[1].details.getAttribute('aria-hidden')).toBe('true');
    nodes[1].toggle.click();

    older.click();
    expect(timeline.classList.contains('is-older-visible')).toBe(true);
    expect(older.textContent).toBe('Less');
    older.click();
    expect(timeline.classList.contains('is-older-visible')).toBe(false);
  });

  test('does nothing when the page has no timeline', async () => {
    install(el('div'));
    const { initCareerTimeline } = await import(`${MODULES}/timeline.js`);
    expect(() => initCareerTimeline()).not.toThrow();
  });

  test('never moves focus or tabindex onto static list items', () => {
    const source = require('fs').readFileSync(require.resolve(`${MODULES}/timeline.js`), 'utf8');
    expect(source).not.toMatch(/tabIndex|tabindex|ArrowDown|keydown|Home|End/);
  });
});

describe('project disclosure binding', () => {
  function page({ withCaseStudies }) {
    const root = el('div');
    const list = el('ul', 'project-list', root);
    list.id = 'project-list';
    const toggle = button(el('div', 'project-more', root), 'project-more-btn', 'project-list', [
      'Show 2 more',
      'Show fewer',
    ]);
    const caseStudies = withCaseStudies ? el('section', 'case-study-deep-dives', root) : null;
    install(root, { '#projects .project-list, #project-list': list });
    return { list, toggle, caseStudies };
  }

  test('expands the list and reveals the case studies together, then collapses both', async () => {
    const { list, toggle, caseStudies } = page({ withCaseStudies: true });
    const { initProjectMore } = await import(`${MODULES}/project-more.js`);
    initProjectMore();
    expect(caseStudies.hidden).toBe(true);

    toggle.click();
    expect(list.classList.contains('is-expanded')).toBe(true);
    expect(caseStudies.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Show fewer');

    toggle.click();
    expect(list.classList.contains('is-expanded')).toBe(false);
    expect(caseStudies.hidden).toBe(true);
    expect(toggle.textContent).toBe('Show 2 more');
  });

  test('works without case studies and does not create a button of its own', async () => {
    const { list, toggle } = page({ withCaseStudies: false });
    const { initProjectMore } = await import(`${MODULES}/project-more.js`);
    initProjectMore();
    toggle.click();
    expect(list.classList.contains('is-expanded')).toBe(true);
    expect(document.querySelectorAll('.project-more-btn')).toHaveLength(1);
  });

  test('does nothing when the server rendered no button', async () => {
    const root = el('div');
    el('ul', 'project-list', root).id = 'project-list';
    install(root, { '#projects .project-list, #project-list': root.children[0] });
    const { initProjectMore } = await import(`${MODULES}/project-more.js`);
    expect(() => initProjectMore()).not.toThrow();
  });
});

describe('cover-letter fold binding', () => {
  test('toggles the fold class on the server-rendered list', async () => {
    const root = el('div');
    const list = el('ol', 'cover-letter__paragraphs', root);
    list.id = 'cover-letter-paragraphs';
    list.setAttribute('data-fold', '');
    const toggle = button(root, 'cover-letter__toggle', 'cover-letter-paragraphs', [
      'Read',
      'Fold',
    ]);
    install(root);
    const { initCoverLetterFold } = await import(`${MODULES}/cover-letter-fold.js`);
    initCoverLetterFold();
    toggle.click();
    expect(list.classList.contains('is-expanded')).toBe(true);
    expect(toggle.textContent).toBe('Fold');
    toggle.click();
    expect(list.classList.contains('is-expanded')).toBe(false);
  });

  test('ignores a letter that was not folded by the server', async () => {
    const root = el('div');
    el('ol', 'cover-letter__paragraphs', root);
    install(root);
    const { initCoverLetterFold } = await import(`${MODULES}/cover-letter-fold.js`);
    expect(() => initCoverLetterFold()).not.toThrow();
  });
});

describe('case-study cards', () => {
  const project = {
    id: 'example',
    title: 'Example Title',
    period: '2026.05 ~ 현재',
    icon: 'rocket',
    stack: ['Python'],
    metrics: [{ icon: 'check', value: '1', label: 'item' }],
  };
  const copy = { cta: 'Review details' };

  test('the launcher is a native dialog button inside a list item and opens the overlay', async () => {
    global.document = createFakeDocument();
    const { createProjectCard } = await import(`${MODULES}/project-cards.js`);
    const open = jest.fn();
    const card = createProjectCard(project, 0, open, copy);
    const launcher = card.querySelector('button');

    expect(card.getAttribute('role')).toBe('listitem');
    expect(card.hasAttribute('tabindex')).toBe(false);
    expect(launcher.getAttribute('type') ?? launcher.type).toBe('button');
    expect(launcher.getAttribute('aria-haspopup')).toBe('dialog');
    expect(launcher.getAttribute('aria-label')).toBe('Review details: Example Title');
    expect(card.querySelectorAll('button')).toHaveLength(1);
    launcher.click();
    expect(open).toHaveBeenCalledWith(project);
  });

  test('localized words in the period get their own span; numerals and separators do not', async () => {
    global.document = createFakeDocument();
    const { createPeriod } = await import(`${MODULES}/project-cards.js`);
    const period = createPeriod('2026.05 ~ 현재');
    expect(period.textContent).toBe('2026.05 ~ 현재');
    const words = period.querySelectorAll('.project-card__period-word');
    expect(words.map((word) => word.textContent)).toEqual(['현재']);
    expect(
      createPeriod('2026.05 ~ 現在').querySelector('.project-card__period-word').textContent
    ).toBe('現在');
    expect(
      createPeriod('2024.01 ~ 2026.02').querySelectorAll('.project-card__period-word')
    ).toHaveLength(0);
  });
});
