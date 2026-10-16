import { bindDisclosure } from './disclosure.js';

const EXPANDED_CLASS = 'is-expanded';
const OLDER_VISIBLE_CLASS = 'is-older-visible';

/**
 * Binds behaviour to the server-rendered career timeline. The list is never replaced, so the
 * first rendered surface is the settled one.
 * @returns {void}
 */
export function initCareerTimeline() {
  const timeline = document.querySelector('.incident-timeline');
  if (!timeline) return;

  timeline.querySelectorAll('.timeline-expand-btn').forEach((button) => {
    const node = button.closest('.timeline-node');
    const card = button.closest('.timeline-card');
    if (!node || !card) return;
    const details = document.getElementById(button.getAttribute('aria-controls') || '');
    details?.setAttribute('aria-hidden', 'true');
    bindDisclosure(/** @type {HTMLElement} */ (button), {
      owner: node,
      openClass: EXPANDED_CLASS,
      animate: [card],
      onChange: (open) => details?.setAttribute('aria-hidden', String(!open)),
    });
  });

  const older = document.querySelector(`.timeline-more-btn[aria-controls="${timeline.id}"]`);
  if (older) {
    bindDisclosure(/** @type {HTMLElement} */ (older), {
      owner: timeline,
      openClass: OLDER_VISIBLE_CLASS,
      animate: [timeline],
    });
  }
}
