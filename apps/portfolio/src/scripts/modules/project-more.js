/**
 * Project "more" Module
 *
 * Progressive disclosure for #projects: the displayOrder-curated cards render
 * visible, and the rest carry `.project-item--collapsed` (hidden via CSS). This adds a
 * "더보기 N개 / show N more" button that toggles `.is-expanded` on the list to
 * reveal/hide the extra cards. No project is removed from the DOM (SEO-safe,
 * accessible) — only the default visual prominence is curated.
 */

function moreLang(extra) {
  const l = (document.documentElement.lang || 'ko').toLowerCase();
  if (l.startsWith('en')) return { more: `Show ${extra} more projects`, less: 'Show fewer' };
  if (l.startsWith('ja')) return { more: `他${extra}件のプロジェクト`, less: '閉じる' };
  return { more: `프로젝트 ${extra}개 더 보기`, less: '접기' };
}

export function initProjectMore() {
  const list = document.querySelector('#projects .project-list, #project-list');
  if (!list) return;

  const extras = list.querySelectorAll('.project-item--collapsed');
  if (extras.length === 0) return;

  list.dataset.projectsExpanded = String(list.classList.contains('is-expanded'));
  if (document.querySelector('[data-projects-expand]')) return;

  const labels = moreLang(extras.length);

  const wrap = document.createElement('div');
  wrap.className = 'project-more';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'project-more-btn';
  btn.dataset.projectsExpand = 'true';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', list.id || 'project-list');
  btn.textContent = labels.more;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    setProjectsExpanded(!list.classList.contains('is-expanded'), { focusButton: true });
  });

  wrap.appendChild(btn);
  list.insertAdjacentElement('afterend', wrap);
}

export function setProjectsExpanded(expanded, { focusButton = false } = {}) {
  const list = document.querySelector('#projects .project-list, #project-list');
  const button = document.querySelector('[data-projects-expand]');
  if (!list || !button) return false;
  const labels = moreLang(list.querySelectorAll('.project-item--collapsed').length);
  list.classList.toggle('is-expanded', expanded);
  list.dataset.projectsExpanded = String(expanded);
  button.setAttribute('aria-expanded', String(expanded));
  button.textContent = expanded ? labels.less : labels.more;
  if (focusButton) button.focus({ preventScroll: true });
  return true;
}

export function ensureProjectIsExpanded(card) {
  if (!card?.classList.contains('project-item--collapsed')) return false;
  const list = card.closest('.project-list');
  if (list?.classList.contains('is-expanded')) return false;
  return setProjectsExpanded(true);
}
