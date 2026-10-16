import { preferredScrollBehavior } from './scroll-behavior.js';

const ANCHOR_OFFSET = 80;

/**
 * @param {Element} link
 * @returns {HTMLElement | null}
 */
function destinationOf(link) {
  const href = link.getAttribute('href') || '';
  if (href.length < 2) return null;
  let id = href.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep the raw fragment */
  }
  return document.getElementById(id);
}

/**
 * Programmatic focus on a non-interactive destination, so the next Tab
 * continues from it (what native fragment navigation does).
 * @param {HTMLElement} target
 */
function focusDestination(target) {
  if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
    target.setAttribute('data-anchor-target', '');
  }
  target.focus({ preventScroll: true });
}

/**
 * @param {MouseEvent} event
 * @returns {boolean}
 */
function isPlainPrimaryClick(event) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * In-page anchors scroll with the header offset, update the hash and move focus
 * to the destination. One delegated listener covers anchors added after init
 * (for example the recruiter action bar).
 */
export function initAnchorScroll() {
  document.addEventListener('click', (event) => {
    if (!isPlainPrimaryClick(event)) return;
    const origin = event.target instanceof Element ? event.target : null;
    const link = origin ? origin.closest('a[href^="#"]') : null;
    if (!link) return;
    const frame = link.getAttribute('target');
    if (frame && frame !== '_self') return;
    const target = destinationOf(link);
    if (!target) return;

    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.pageYOffset - ANCHOR_OFFSET;
    window.scrollTo({ top, behavior: preferredScrollBehavior() });
    const hash = /** @type {string} */ (link.getAttribute('href'));
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    focusDestination(target);
  });
}
