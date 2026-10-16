import { bindDisclosure } from './disclosure.js';

/**
 * Binds the server-rendered cover-letter toggle. Without JavaScript every paragraph renders.
 * @returns {void}
 */
export function initCoverLetterFold() {
  const list = document.querySelector('.cover-letter__paragraphs[data-fold]');
  const button = list?.id
    ? document.querySelector(`.cover-letter__toggle[aria-controls="${list.id}"]`)
    : null;
  if (!list || !button) return;
  bindDisclosure(/** @type {HTMLElement} */ (button), {
    owner: list,
    openClass: 'is-expanded',
  });
}
