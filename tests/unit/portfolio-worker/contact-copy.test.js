/**
 * Behavior tests for the contact copy-to-clipboard enhancement.
 * Jest runs in a node env (no jsdom), so we use a tiny fake DOM that models
 * just enough: a link with dataset, classList, textContent, addEventListener,
 * and a status element queried via the provided root.
 */

function makeEl(attrs = {}) {
  const listeners = {};
  const classes = new Set();
  return {
    dataset: attrs.dataset || {},
    textContent: attrs.textContent || '',
    _attrs: { ...attrs },
    getAttribute(name) {
      return this._attrs[name] ?? null;
    },
    setAttribute(name, val) {
      this._attrs[name] = String(val);
    },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
    dispatch(type, event = {}) {
      let prevented = false;
      const ev = { preventDefault() { prevented = true; }, ...event };
      (listeners[type] || []).forEach((fn) => fn(ev));
      this._lastPrevented = prevented;
    },
  };
}

function makeRoot({ email = 'test@example.com' } = {}) {
  const link = makeEl({
    dataset: { contactEmail: email },
    textContent: 'Email',
    href: `mailto:${email}`,
  });
  const status = makeEl();
  status._attrs.class = 'contact-copy-status';
  return {
    link,
    status,
    querySelectorAll: (sel) => (sel.includes('contact-email') ? [link] : []),
    querySelector: (sel) => (sel.includes('contact-copy-status') ? status : null),
  };
}

describe('contact-copy module', () => {
  let initContactCopy;
  beforeAll(async () => {
    ({ initContactCopy } = await import(
      '../../../apps/portfolio/src/scripts/modules/contact-copy.js'
    ));
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.navigator;
  });

  test('contact-copy: clicking the email control copies the address via clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    global.navigator = { clipboard: { writeText } };
    const root = makeRoot({ email: 'me@x.com' });
    initContactCopy(root);
    root.link.dispatch('click');
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('me@x.com');
    expect(root.link.classList.contains('is-copied')).toBe(true);
  });

  test('contact-copy: fails open when clipboard rejects (no throw)', async () => {
    global.navigator = { clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } };
    const root = makeRoot();
    initContactCopy(root);
    await expect(
      (async () => {
        root.link.dispatch('click');
        await Promise.resolve();
        await Promise.resolve();
      })()
    ).resolves.toBeUndefined();
  });

  test('contact-copy: missing Clipboard API degrades without throwing', () => {
    global.navigator = {};
    const root = makeRoot();
    expect(() => {
      initContactCopy(root);
      root.link.dispatch('click');
    }).not.toThrow();
  });

  test('contact-copy: copied state resets after the feedback timer', async () => {
    jest.useFakeTimers();
    global.navigator = { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } };
    const root = makeRoot();
    initContactCopy(root);
    root.link.dispatch('click');
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(2500);
    expect(root.link.classList.contains('is-copied')).toBe(false);
  });

  test('contact-copy: clipboard rejection falls open to the mailto link', async () => {
    // The click is prevented to attempt a copy; if the copy FAILS the user must
    // still reach the inbox. Otherwise they get neither copy nor mailto.
    global.navigator = {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    };
    const root = makeRoot({ email: 'fail@x.com' });
    const navigate = jest.fn();
    initContactCopy(root, { navigate });
    root.link.dispatch('click');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith('mailto:fail@x.com');
  });
});
