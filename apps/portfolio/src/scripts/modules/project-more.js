import { bindDisclosure } from './disclosure.js';

/**
 * Binds the server-rendered "show more projects" button. Korean pages also reveal the case-study
 * deep dives mounted after the list; they stay out of view until the disclosure opens.
 */
export function initProjectMore() {
  const list = document.querySelector('#projects .project-list, #project-list');
  const button = document.querySelector('.project-more-btn');
  if (!list || !button) return;

  const caseStudies = /** @type {HTMLElement | null} */ (
    document.querySelector('.case-study-deep-dives')
  );
  if (caseStudies) caseStudies.hidden = true;
  bindDisclosure(/** @type {HTMLElement} */ (button), {
    owner: list,
    openClass: 'is-expanded',
    animate: caseStudies ? [list, caseStudies] : [list],
    onChange: (open) => {
      if (caseStudies) caseStudies.hidden = !open;
    },
  });
}
