const vm = require('vm');
const {
  injectEarlyScript,
  READY_ATTRIBUTE,
  FAIL_SAFE_MS,
} = require('../../../../apps/portfolio/lib/progressive-enhancement');
const { injectPlaceholders } = require('../../../../apps/portfolio/lib/html-transformer');

function earlyScript() {
  const html = injectEarlyScript('<html><head><title>t</title></head><body></body></html>');
  return /<script>([\s\S]*)<\/script><\/head>/.exec(html)[1];
}

function run({ ready }) {
  const root = { classes: new Set(), attrs: new Set(ready ? [READY_ATTRIBUTE] : []) };
  root.classList = {
    add: (name) => root.classes.add(name),
    remove: (name) => root.classes.delete(name),
  };
  root.hasAttribute = (name) => root.attrs.has(name);
  const timers = [];
  const errorListeners = [];
  vm.runInNewContext(earlyScript(), {
    document: { documentElement: root },
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    addEventListener: (type, listener, capture) => {
      if (type === 'error' && capture === true) errorListeners.push(listener);
    },
  });
  const fail = (event) => errorListeners.forEach((listener) => listener(event));
  return { root, timers, fail };
}

describe('early script', () => {
  test('is injected once, as the last element of <head>', () => {
    const html = injectEarlyScript('<html><head></head><body></body></html>');
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html.indexOf('</script></head>')).toBeGreaterThan(0);
    expect(injectEarlyScript('<body></body>')).toBe('<body></body>');
  });

  test('marks the document script-enabled before first paint', () => {
    expect(run({ ready: false }).root.classes.has('js')).toBe(true);
  });

  test('lifts the mark after the bounded fail-safe when the module never reported ready', () => {
    const { root, timers } = run({ ready: false });
    expect(timers).toHaveLength(1);
    expect(timers[0].delay).toBe(FAIL_SAFE_MS);
    timers[0].callback();
    expect(root.classes.has('js')).toBe(false);
  });

  test('keeps the mark when the module reported ready', () => {
    const { root, timers } = run({ ready: true });
    timers[0].callback();
    expect(root.classes.has('js')).toBe(true);
  });

  test('lifts the mark at once when the main module fails to load or throws', () => {
    const loadFailure = run({ ready: false });
    loadFailure.fail({ target: { tagName: 'SCRIPT', src: 'https://example.test/main.js?v=1' } });
    expect(loadFailure.root.classes.has('js')).toBe(false);

    const thrown = run({ ready: false });
    thrown.fail({ target: {}, filename: 'https://example.test/main.js?v=1' });
    expect(thrown.root.classes.has('js')).toBe(false);
  });

  test('keeps the mark for failures of other resources', () => {
    const { root, fail } = run({ ready: false });
    fail({ target: { tagName: 'IMG', src: 'https://example.test/assets/photo.jpg' } });
    fail({ target: {}, filename: 'https://example.test/sw.js' });
    expect(root.classes.has('js')).toBe(true);
  });
});

describe('injectPlaceholders()', () => {
  test('fills the disclosure and skill placeholders', () => {
    const html = injectPlaceholders(
      '<!-- PROJECT_MORE_PLACEHOLDER --><!-- SKILL_RADAR_PLACEHOLDER -->',
      {
        cssContent: '',
        resumeCardsHtml: '',
        projectCardsHtml: '',
        infrastructureCardsHtml: '',
        skillsHtml: '',
        contactGridHtml: '',
        projectMoreHtml: '<div class="project-more"></div>',
        skillDomainsHtml: '<article></article>',
      }
    );
    expect(html).toBe('<div class="project-more"></div><article></article>');
  });
});
