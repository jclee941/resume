/**
 * Konami code easter egg — extracted verbatim from the inline index.html script.
 * Listens for ↑↑↓↓←→←→BA and flashes a 3s "HACK MODE ACTIVATED" overlay.
 *
 * Dependencies are injected (doc, timer) so the behavior is unit-testable
 * without jsdom or a real browser.
 */

const KONAMI_CODE = [
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

export function initKonami(doc = document, timer = setTimeout) {
  let index = 0;

  doc.addEventListener('keydown', (e) => {
    if (e.code === KONAMI_CODE[index]) {
      index++;
      if (index === KONAMI_CODE.length) {
        activateHackMode(doc, timer);
        index = 0;
      }
    } else {
      index = 0;
    }
  });
}

function activateHackMode(doc, timer) {
  const overlay = doc.createElement('div');
  overlay.id = 'hack-mode-overlay';
  overlay.className = 'hack-mode-overlay';
  overlay.innerHTML =
    '<div class="hack-text">HACK MODE ACTIVATED</div><div class="hack-sub">// root access granted</div>';
  doc.body.appendChild(overlay);

  timer(() => {
    overlay.remove();
  }, 3000);
}
