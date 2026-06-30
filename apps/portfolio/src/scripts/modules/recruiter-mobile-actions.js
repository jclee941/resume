import { getHiringActions } from './recruiter-enhancements-data.js';
import { renderIcon } from './project-card-formatting.js';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
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
  bar.innerHTML = `
    <a class="recruiter-action-bar__link" href="${escapeHtml(actions.mail)}">${escapeHtml(labels.contact)}</a>
    <a class="recruiter-action-bar__link" href="#projects">${escapeHtml(labels.projects)}</a>
    <a class="recruiter-action-bar__link" href="/resume.pdf" download="${escapeHtml(actions.downloadName)}">${escapeHtml(labels.pdf)}</a>
    <button type="button" class="recruiter-action-bar__dismiss" aria-label="${escapeHtml(labels.dismiss)}">${renderIcon('x', 'recruiter-action-bar__dismiss-icon')}</button>
  `;
  bar.querySelector('button')?.addEventListener('click', () => {
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
