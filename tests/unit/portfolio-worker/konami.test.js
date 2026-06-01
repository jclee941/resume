/**
 * Behavior tests for the extracted Konami easter egg module (jsdom-free).
 * A minimal fake document + injected timer exercise the real logic.
 */

const path = require('path');

const MODULE_PATH = path.resolve(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/konami.js'
);

function makeFakeDoc() {
  const listeners = {};
  const appended = [];
  const overlay = {
    id: '',
    className: '',
    innerHTML: '',
    removed: false,
    remove() {
      this.removed = true;
    },
  };
  return {
    overlay,
    appended,
    _fire(code) {
      (listeners.keydown || []).forEach((fn) => fn({ code }));
    },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    createElement() {
      return overlay;
    },
    body: {
      appendChild(el) {
        appended.push(el);
      },
    },
  };
}

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];

describe('initKonami()', () => {
  let initKonami;
  beforeAll(async () => {
    ({ initKonami } = await import(MODULE_PATH));
  });

  test('full sequence appends the hack-mode overlay', () => {
    const doc = makeFakeDoc();
    initKonami(doc, () => {});
    SEQUENCE.forEach((code) => doc._fire(code));
    expect(doc.appended).toHaveLength(1);
    expect(doc.overlay.id).toBe('hack-mode-overlay');
    expect(doc.overlay.innerHTML).toMatch(/HACK MODE ACTIVATED/);
  });

  test('a wrong key resets progress (no overlay)', () => {
    const doc = makeFakeDoc();
    initKonami(doc, () => {});
    doc._fire('ArrowUp');
    doc._fire('ArrowUp');
    doc._fire('KeyX'); // wrong → reset
    SEQUENCE.slice(0, 9).forEach((code) => doc._fire(code));
    expect(doc.appended).toHaveLength(0);
  });

  test('overlay is removed via the injected timer', () => {
    const doc = makeFakeDoc();
    let scheduled = null;
    initKonami(doc, (fn) => {
      scheduled = fn;
    });
    SEQUENCE.forEach((code) => doc._fire(code));
    expect(doc.overlay.removed).toBe(false);
    scheduled();
    expect(doc.overlay.removed).toBe(true);
  });
});

describe('konami extraction: inline block removed, wired via main.js', () => {
  const fs = require('fs');
  const P = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio');
  test('index.html no longer defines the inline konami block', () => {
    const html = fs.readFileSync(path.join(P, 'index.html'), 'utf-8');
    expect(html).not.toContain('var konamiCode');
    expect(html).not.toContain('function activateHackMode');
  });
  test('main.js imports and initializes initKonami', () => {
    const main = fs.readFileSync(path.join(P, 'src', 'scripts', 'main.js'), 'utf-8');
    expect(main).toMatch(/import \{ initKonami \} from '\.\/modules\/konami\.js'/);
    expect(main).toMatch(/initKonami\(\)/);
  });
});
