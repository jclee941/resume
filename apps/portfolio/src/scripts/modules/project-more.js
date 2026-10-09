/**
 * Project "more" Module
 *
 * Progressive disclosure for #projects: the displayOrder-curated cards render
 * visible, and the rest carry `.project-item--collapsed` (hidden via CSS). This adds a
 * "더보기 N개 / show N more" button that toggles `.is-expanded` on the list to
 * reveal/hide the extra cards. No project is removed from the DOM (SEO-safe,
 * accessible) — only the default visual prominence is curated. When the KO
 * case-study deep dives are present they join the same disclosure.
 */

/**
 * @param {number} extra
 * @param {boolean} withCaseStudies
 * @returns {{ more: string; less: string }}
 */
function moreLang(extra, withCaseStudies) {
  const l = (document.documentElement.lang || 'ko').toLowerCase();
  if (l.startsWith('en')) {
    const more = withCaseStudies
      ? `Show ${extra} more projects and case studies`
      : `Show ${extra} more projects`;
    return { more, less: 'Show fewer' };
  }
  if (l.startsWith('ja')) {
    const more = withCaseStudies
      ? `他${extra}件のプロジェクトと詳細事例`
      : `他${extra}件のプロジェクト`;
    return { more, less: '閉じる' };
  }
  const more = withCaseStudies
    ? `프로젝트 ${extra}개·심층 사례 더 보기`
    : `프로젝트 ${extra}개 더 보기`;
  return { more, less: '접기' };
}

export function initProjectMore() {
  const list = document.querySelector('#projects .project-list, #project-list');
  if (!list) return;

  const extras = list.querySelectorAll('.project-item--collapsed');
  if (extras.length === 0) return;

  const caseStudies = /** @type {HTMLElement | null} */ (
    document.querySelector('.case-study-deep-dives')
  );
  if (caseStudies) caseStudies.hidden = true;
  const labels = moreLang(extras.length, Boolean(caseStudies));

  const wrap = document.createElement('div');
  wrap.className = 'project-more';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'project-more-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', list.id || 'project-list');
  btn.textContent = labels.more;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const expanded = list.classList.toggle('is-expanded');
    if (caseStudies) caseStudies.hidden = !expanded;
    btn.setAttribute('aria-expanded', String(expanded));
    btn.textContent = expanded ? labels.less : labels.more;
  });

  wrap.appendChild(btn);
  list.insertAdjacentElement('afterend', wrap);
}
