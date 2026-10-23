/**
 * The page shells bind the phone menu inline so it works before main.js loads. That binding marks
 * the toggle 'early' and stops acting once ui.js takes the menu over by marking it 'true'.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PORTFOLIO = path.resolve(__dirname, '../../../apps/portfolio');

function inlineNavScript(file) {
  const html = fs.readFileSync(path.join(PORTFOLIO, file), 'utf8');
  const bodies = html
    .split('<script>')
    .slice(1)
    .map((part) => part.slice(0, part.indexOf('</script>')));
  return bodies.find((body) => body.includes('function bindMobileNav'));
}

function makeElement() {
  const attributes = new Map();
  const classes = new Set();
  const listeners = {};
  return {
    dataset: {},
    getAttribute: (name) => (attributes.has(name) ? attributes.get(name) : null),
    setAttribute: (name, value) => attributes.set(name, String(value)),
    addEventListener: (type, listener) => {
      (listeners[type] ||= []).push(listener);
    },
    dispatch: (type, event = {}) => (listeners[type] || []).forEach((listener) => listener(event)),
    focus: jest.fn(),
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name) => (classes.has(name) ? !classes.delete(name) : !!classes.add(name)),
    },
  };
}

function bootPage(file, dataset = {}) {
  const toggle = makeElement();
  Object.assign(toggle.dataset, dataset);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('data-nav-label-open', 'Open');
  toggle.setAttribute('data-nav-label-close', 'Close');
  const link = makeElement();
  const navLinks = makeElement();
  navLinks.querySelectorAll = () => [link];
  const document = makeElement();
  document.readyState = 'complete';
  const elements = { '.nav-toggle': toggle, '.nav-links': navLinks };
  document.querySelector = (selector) => elements[selector] ?? null;
  vm.runInNewContext(inlineNavScript(file), { document });
  return { toggle, navLinks, link, document };
}

describe.each(['index.html', 'index-en.html'])('inline phone menu binding in %s', (file) => {
  test('works before main.js loads', () => {
    const page = bootPage(file);
    expect(page.toggle.dataset.mobileNavBound).toBe('early');
    page.toggle.dispatch('click');
    expect(page.toggle.getAttribute('aria-expanded')).toBe('true');
    expect(page.toggle.getAttribute('aria-label')).toBe('Close');
    expect(page.navLinks.classList.contains('open')).toBe(true);
    page.document.dispatch('keydown', { key: 'Escape' });
    expect(page.navLinks.classList.contains('open')).toBe(false);
    expect(page.toggle.focus).toHaveBeenCalledTimes(1);
  });

  test('stops acting once ui.js marks the toggle as bound', () => {
    const page = bootPage(file);
    page.toggle.dataset.mobileNavBound = 'true';
    page.toggle.dispatch('click');
    expect(page.toggle.getAttribute('aria-expanded')).toBe('false');
    expect(page.navLinks.classList.contains('open')).toBe(false);
    page.navLinks.classList.add('open');
    page.link.dispatch('click');
    page.document.dispatch('keydown', { key: 'Escape' });
    expect(page.navLinks.classList.contains('open')).toBe(true);
    expect(page.toggle.focus).not.toHaveBeenCalled();
  });

  test('leaves a toggle that is already bound', () => {
    const page = bootPage(file, { mobileNavBound: 'true' });
    expect(page.toggle.dataset.mobileNavBound).toBe('true');
    page.toggle.dispatch('click');
    expect(page.navLinks.classList.contains('open')).toBe(false);
  });
});
