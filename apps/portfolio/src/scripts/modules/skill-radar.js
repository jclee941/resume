function skillGridLabel() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return 'Skills';
  if (lang.startsWith('ja')) return 'スキル';
  return '기술 스택';
}

/** @param {HTMLElement} container */
function syncCarouselEdge(container) {
  const atEnd =
    container.scrollWidth > container.clientWidth &&
    container.scrollLeft + container.clientWidth >= container.scrollWidth - 4;
  container.classList.toggle('is-scroll-end', atEnd);
}

/** @param {HTMLElement} container */
function syncOverflowTabIndex(container) {
  const hasFocus = container.matches(':focus-within');
  if (hasFocus || container.scrollWidth > container.clientWidth) {
    container.setAttribute('tabindex', '0');
  } else {
    container.removeAttribute('tabindex');
  }
  syncCarouselEdge(container);
}

/**
 * Hydrates the server-rendered skill domain cards: it names the group and keeps the scroller
 * keyboard-reachable only while it overflows. The cards themselves are never rebuilt.
 */
function initSkillRadar() {
  const projectList = document.getElementById('project-list');
  if (projectList) {
    syncCarouselEdge(projectList);
    projectList.addEventListener('scroll', () => syncCarouselEdge(projectList), { passive: true });
  }
  const container = document.getElementById('skill-radar-grid');
  if (!container) return;
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', skillGridLabel());
  syncOverflowTabIndex(container);
  container.addEventListener('scroll', () => syncCarouselEdge(container), { passive: true });
  container.addEventListener('focusout', () => syncOverflowTabIndex(container));
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => syncOverflowTabIndex(container)).observe(container);
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', () => syncOverflowTabIndex(container), { passive: true });
  }
}

export { initSkillRadar };
