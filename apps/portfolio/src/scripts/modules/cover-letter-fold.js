import { bindDisclosure } from './disclosure.js';

/**
 * Binds server-rendered fold toggles (cover letter, about highlights). Without JavaScript every item renders.
 * @returns {void}
 */
export function initCoverLetterFold() {
  document.querySelectorAll('[data-fold]').forEach((list) => {
    const button = list.id ? document.querySelector(`[aria-controls="${list.id}"]`) : null;
    if (!button) return;
    bindDisclosure(/** @type {HTMLElement} */ (button), {
      owner: list,
      openClass: 'is-expanded',
    });
  });
}
