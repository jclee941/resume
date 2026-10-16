const fs = require('fs');
const path = require('path');
const vm = require('vm');

/**
 * Layout/content simplification contract: removes always-visible duplication.
 *
 * The About section rendered tech_philosophy / current_focus TWICE: once via
 * the data-driven `> tech_philosophy` / `> current_focus` blocks (from
 * aboutSection in the SSoT) and again via a hardcoded `about-principles`
 * block ("엔지니어링 원칙" / "Engineering Principles" + "현재 집중 영역" /
 * "Current Focus"). The hardcoded block is a pure duplicate and must be gone.
 */
describe('simplification: no duplicated About principles/focus block', () => {
  const workerPath = path.join(__dirname, '../../../apps/portfolio/worker.js');
  let worker;
  beforeAll(() => {
    worker = fs.readFileSync(workerPath, 'utf8');
  });

  function count(haystack, needle) {
    return haystack.split(needle).length - 1;
  }

  test('the hardcoded about-principles block is absent from all locales', () => {
    // The block had id="about-principles" (HTML only) and its now-dead CSS
    // selectors were removed too, so no occurrence should remain anywhere.
    expect(count(worker, 'about-principles')).toBe(0);
  });

  test('the duplicate Korean "엔지니어링 원칙" / "현재 집중 영역" headings are gone', () => {
    expect(count(worker, '엔지니어링 원칙')).toBe(0);
    expect(count(worker, '현재 집중 영역')).toBe(0);
  });

  test('the duplicate English "Engineering Principles" / "Current Focus" headings are gone', () => {
    expect(count(worker, 'Engineering Principles')).toBe(0);
    expect(count(worker, 'Current Focus')).toBe(0);
  });

  test('career-highlights narrative remains the single About block, localized per locale', () => {
    // Localized reader-facing headings replaced the '&gt; career_highlights'
    // terminal-style label (one heading per locale page).
    expect(count(worker, 'about-label">경력 하이라이트<')).toBe(1);
    expect(count(worker, 'about-label">Career highlights<')).toBe(1);
    expect(count(worker, 'about-label">経歴ハイライト<')).toBe(1);
    expect(count(worker, '&gt; career_highlights')).toBe(0);
  });

  test('overlapping tech_philosophy / current_focus About blocks are removed', () => {
    // These restated the career story already covered by career_highlights,
    // achievements, and the career timeline — dropped to cut clutter.
    expect(count(worker, '&gt; tech_philosophy')).toBe(0);
    expect(count(worker, '&gt; current_focus')).toBe(0);
  });
});

describe('simplification: project cards do not re-present the description as bullets', () => {
  const fs = require('fs');
  const path = require('path');
  const expandPath = path.join(
    __dirname,
    '../../../apps/portfolio/src/scripts/modules/project-expand.js'
  );
  const mainPath = path.join(__dirname, '../../../apps/portfolio/src/scripts/main.js');
  let expandSrc = '';
  let mainSrc = '';
  try {
    expandSrc = fs.readFileSync(expandPath, 'utf8');
  } catch {
    expandSrc = '';
  }
  beforeAll(() => {
    mainSrc = fs.readFileSync(mainPath, 'utf8');
  });

  test('the description-derived feature-bullet generator is gone', () => {
    // The expand panel split .project-description into the same sentences as
    // "주요 기능" / "Key Features" bullets — pure content duplication.
    expect(expandSrc).not.toMatch(/splitFeatures/);
    expect(expandSrc).not.toMatch(/project-details__features/);
  });

  test('main.js no longer bootstraps the redundant project-expand enhancement', () => {
    expect(mainSrc).not.toMatch(/initProjectExpand/);
  });

  function runMain({ failing } = {}) {
    const registration = { scope: 'http://localhost/', update: jest.fn() };
    const calls = [];
    const initialiser = (name) =>
      jest.fn(() => {
        if (name === failing) throw new Error('boom');
        calls.push(name);
      });
    const root = {
      attrs: new Set(),
      classes: new Set(),
      setAttribute: (name) => root.attrs.add(name),
      classList: { add: (name) => root.classes.add(name) },
    };
    const context = {
      console: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
      setInterval: jest.fn(),
      fetch: jest.fn(),
      window: { location: { hash: '' }, addEventListener: jest.fn() },
      document: {
        readyState: 'complete',
        documentElement: root,
        addEventListener: jest.fn(),
        getElementById: jest.fn(),
      },
      navigator: {
        serviceWorker: {
          register: jest.fn(() => {
            calls.push('register-service-worker');
            return Promise.resolve(registration);
          }),
          addEventListener: jest.fn(),
        },
      },
    };
    for (const name of [
      'initWebVitals',
      'initUI',
      'initSkillRadar',
      'initCareerTimeline',
      'initProjectCards',
      'initProjectMore',
      'initRecruiterEnhancements',
      'initCoverLetterFold',
    ]) {
      context[name] = initialiser(name);
    }
    context.window.window = context.window;
    vm.runInNewContext(mainSrc.replace(/^import .*;\n/gm, ''), context);
    return { context, calls, root };
  }

  test('main.js registers the service worker even when imported after window load', () => {
    const { context, calls } = runMain();
    expect(context.navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    expect(calls).toContain('register-service-worker');
  });

  test('main.js binds every server-rendered feature immediately and never fetches resume data', () => {
    const { context, root } = runMain();
    for (const name of [
      'initUI',
      'initWebVitals',
      'initProjectCards',
      'initProjectMore',
      'initRecruiterEnhancements',
      'initCoverLetterFold',
      'initSkillRadar',
      'initCareerTimeline',
    ]) {
      expect(context[name]).toHaveBeenCalledTimes(1);
    }
    expect(context.fetch).not.toHaveBeenCalled();
    expect(root.attrs.has('data-js-ready')).toBe(true);
    expect(root.classes.has('js')).toBe(true);
  });

  test('project cards mount before the project disclosure so the case studies join it', () => {
    const { calls } = runMain();
    expect(calls.indexOf('initProjectCards')).toBeLessThan(calls.indexOf('initProjectMore'));
  });

  test('one failing initialiser does not stop the others and withholds the ready flag', () => {
    const { context, root } = runMain({ failing: 'initProjectMore' });
    expect(context.initCareerTimeline).toHaveBeenCalledTimes(1);
    expect(context.initCoverLetterFold).toHaveBeenCalledTimes(1);
    expect(context.console.error).toHaveBeenCalled();
    expect(root.attrs.has('data-js-ready')).toBe(false);
    expect(root.classes.has('js')).toBe(false);
  });
});
