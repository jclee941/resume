const { createFakeDocument, createFakeElement } = require('../../helpers/fake-dom');

const MODULE = '../../../apps/portfolio/src/scripts/modules/disclosure.js';

function install({ reducedMotion = false } = {}) {
  global.document = createFakeDocument();
  global.window = { matchMedia: () => ({ matches: reducedMotion }) };
  global.getComputedStyle = () => ({
    getPropertyValue: (name) =>
      ({ '--duration-base': '200ms', '--ease-out': ' ease-out ' })[name] || '',
  });
}

function uninstall() {
  delete global.document;
  delete global.window;
  delete global.getComputedStyle;
}

function sized(height) {
  const element = createFakeElement('div');
  element.rect = { left: 0, top: 0, width: 100, height };
  return element;
}

describe('animateGeometry()', () => {
  afterEach(uninstall);

  test('animates from the old rendered height to the new one with token timing', async () => {
    install();
    const { animateGeometry } = await import(MODULE);
    const element = sized(100);
    animateGeometry([element], () => {
      element.rect = { ...element.rect, height: 300 };
    });
    expect(element.animations).toHaveLength(1);
    expect(element.animations[0].keyframes).toEqual([
      { height: '100px', overflow: 'clip' },
      { height: '300px', overflow: 'clip' },
    ]);
    expect(element.animations[0].options).toEqual({ duration: 200, easing: 'ease-out' });
  });

  test('exit mirrors entry: collapsing animates back with the same timing', async () => {
    install();
    const { animateGeometry } = await import(MODULE);
    const element = sized(300);
    animateGeometry([element], () => {
      element.rect = { ...element.rect, height: 100 };
    });
    const [exit] = element.animations;
    expect(exit.keyframes.map((frame) => frame.height)).toEqual(['300px', '100px']);
    expect(exit.options).toEqual({ duration: 200, easing: 'ease-out' });
  });

  test('a second toggle cancels the animation in flight and continues from the current height', async () => {
    install();
    const { animateGeometry } = await import(MODULE);
    const element = sized(100);
    animateGeometry([element], () => {
      element.rect = { ...element.rect, height: 300 };
    });
    element.rect = { ...element.rect, height: 180 };
    animateGeometry([element], () => {
      element.rect = { ...element.rect, height: 100 };
    });
    expect(element.animations[0].cancelled).toBe(true);
    expect(element.animations[1].keyframes.map((frame) => frame.height)).toEqual([
      '180px',
      '100px',
    ]);
  });

  test('applies the change instantly under reduced motion', async () => {
    install({ reducedMotion: true });
    const { animateGeometry } = await import(MODULE);
    const element = sized(100);
    const mutate = jest.fn(() => {
      element.rect = { ...element.rect, height: 300 };
    });
    animateGeometry([element], mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(element.animations).toHaveLength(0);
  });

  test('skips elements whose height does not change', async () => {
    install();
    const { animateGeometry } = await import(MODULE);
    const element = sized(100);
    animateGeometry([element], () => {});
    expect(element.animations).toHaveLength(0);
  });
});

describe('bindDisclosure()', () => {
  afterEach(uninstall);

  function setup() {
    const owner = sized(100);
    const button = createFakeElement('button');
    button.setAttribute('aria-expanded', 'false');
    button.dataset.labelClosed = 'Show';
    button.dataset.labelOpen = 'Hide';
    button.textContent = 'Show';
    return { owner, button };
  }

  test('toggles the open class, aria-expanded and the label on each click', async () => {
    install();
    const { bindDisclosure } = await import(MODULE);
    const { owner, button } = setup();
    const onChange = jest.fn();
    bindDisclosure(button, { owner, openClass: 'is-open', onChange });

    button.click();
    expect(owner.classList.contains('is-open')).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toBe('Hide');
    expect(onChange).toHaveBeenLastCalledWith(true);

    button.click();
    expect(owner.classList.contains('is-open')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.textContent).toBe('Show');
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  test('keeps the accessible name in step with the state when the button carries names', async () => {
    install();
    const { bindDisclosure } = await import(MODULE);
    const { owner, button } = setup();
    button.dataset.nameClosed = 'Show details';
    button.dataset.nameOpen = 'Hide details';
    button.setAttribute('aria-label', 'Show details');
    bindDisclosure(button, { owner, openClass: 'is-open' });
    button.click();
    expect(button.getAttribute('aria-label')).toBe('Hide details');
    button.click();
    expect(button.getAttribute('aria-label')).toBe('Show details');
  });

  test('writes the label into a dedicated label node when the button has one', async () => {
    install();
    const { bindDisclosure } = await import(MODULE);
    const { owner, button } = setup();
    const label = createFakeElement('span');
    label.setAttribute('data-disclosure-label', '');
    label.textContent = 'Show';
    const hint = createFakeElement('span');
    hint.textContent = ' hint';
    button.children = [label, hint];
    bindDisclosure(button, { owner, openClass: 'is-open' });
    button.click();
    expect(label.textContent).toBe('Hide');
    expect(hint.textContent).toBe(' hint');
  });
});
