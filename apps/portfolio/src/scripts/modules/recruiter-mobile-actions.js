import { getHiringActions } from './recruiter-enhancements-data.js';
import { createIconElement } from './project-card-formatting.js';

// DOM construction instead of innerHTML keeps this module Trusted-Types clean.
function createActionLink(href, label, download) {
  const link = document.createElement('a');
  link.className = 'recruiter-action-bar__link';
  link.href = href;
  if (download) link.setAttribute('download', download);
  link.textContent = label;
  return link;
}

function observeVisibilityBlocker(selector, rootMargin, setInView) {
  const target = document.querySelector(selector);
  if (!target || typeof IntersectionObserver !== 'function') return;
  const observer = new IntersectionObserver(
    (entries) => {
      setInView(entries.some((entry) => entry.isIntersecting));
    },
    { rootMargin, threshold: 0 }
  );
  observer.observe(target);
}

export function renderMobileActionBar(labels) {
  if (document.querySelector('.recruiter-action-bar')) return;
  const actions = getHiringActions();
  const bar = document.createElement('aside');
  bar.className = 'recruiter-action-bar';
  bar.setAttribute('aria-label', 'Recruiter actions');
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'recruiter-action-bar__dismiss';
  dismiss.setAttribute('aria-label', labels.dismiss);
  dismiss.appendChild(createIconElement('x', 'recruiter-action-bar__dismiss-icon'));
  bar.append(
    createActionLink(actions.mail, labels.contact),
    createActionLink('#projects', labels.projects),
    createActionLink('/resume.pdf', labels.pdf, actions.downloadName),
    dismiss
  );
  dismiss.addEventListener('click', () => {
    bar.hidden = true;
    bar.classList.remove('is-visible');
  });
  document.body.appendChild(bar);

  let coverLetterInView = false;
  let reviewPacketInView = false;
  const updateVisibility = () => {
    if (bar.hidden) return;
    bar.classList.toggle(
      'is-visible',
      window.scrollY > 120 && !coverLetterInView && !reviewPacketInView
    );
  };
  observeVisibilityBlocker('#cover-letter', '0px 0px -15% 0px', (isInView) => {
    coverLetterInView = isInView;
    updateVisibility();
  });
  observeVisibilityBlocker('.hiring-review-packet', '0px 0px -10% 0px', (isInView) => {
    reviewPacketInView = isInView;
    updateVisibility();
  });
  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
}
