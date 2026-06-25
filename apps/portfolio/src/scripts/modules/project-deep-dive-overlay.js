import { escapeHtml, getTechClass, renderIcon } from './project-card-formatting.js';

let overlay = null;
let isOpen = false;
let previousFocus = null;

function dialogLabels() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) {
    return { dialog: 'Project details', close: 'Close', esc: 'Close', tab: 'Navigate' };
  }
  if (lang.startsWith('ja')) {
    return { dialog: 'プロジェクト詳細', close: '閉じる', esc: '閉じる', tab: 'ナビゲーション' };
  }
  return { dialog: '프로젝트 상세 정보', close: '닫기', esc: '닫기', tab: '탐색' };
}

export function createDeepDiveOverlay() {
  if (overlay) return { open: openDeepDive };

  overlay = document.createElement('div');
  overlay.className = 'deep-dive-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const labels = dialogLabels();
  overlay.setAttribute('aria-label', labels.dialog);
  overlay.innerHTML = `
    <div class="deep-dive-panel">
      <button class="deep-dive-close" aria-label="${labels.close}">${renderIcon('x', 'deep-dive-close__icon')}</button>
      <div class="deep-dive-content" id="deep-dive-content"></div>
      <div class="keyboard-hint">
        <span class="key-hint"><span class="key-hint__key">ESC</span> ${labels.esc}</span>
        <span class="key-hint"><span class="key-hint__key">Tab</span> ${labels.tab}</span>
      </div>
    </div>
  `;

  overlay.querySelector('.deep-dive-close').addEventListener('click', closeDeepDive);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDeepDive();
  });
  document.addEventListener('keydown', handleKeydown);
  document.body.appendChild(overlay);
  return { open: openDeepDive };
}

function openDeepDive(project) {
  if (!overlay) return;

  const content = overlay.querySelector('#deep-dive-content');
  content.innerHTML = `
    <div class="deep-dive-header">
      <div class="deep-dive-header__icon">${renderIcon(project.icon)}</div>
      <div class="deep-dive-header__content">
        <h2 class="deep-dive-header__title">${escapeHtml(project.title)}</h2>
        <div class="deep-dive-header__period">${escapeHtml(project.period)}</div>
        <div class="deep-dive-header__tags">
          ${project.stack.map((tech) => `<span class="tech-tag tech-tag--${getTechClass(tech)}">${escapeHtml(tech)}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="deep-dive-content">
      ${renderTextSection('개요', `<p class="project-detail__description">${escapeHtml(project.description)}</p>`)}
      ${renderTextSection('주요 성과', renderAchievements(project.achievements))}
      ${renderTextSection('메트릭스', renderMetrics(project.metrics))}
      ${renderTextSection('아키텍처', renderArchitecture(project))}
      ${renderTextSection('사용 도구', renderTools(project.tools))}
    </div>
  `;

  previousFocus = document.activeElement;
  overlay.classList.add('active');
  isOpen = true;
  document.body.style.overflow = 'hidden';
  overlay.querySelector('.deep-dive-close')?.focus();
  window.setTimeout(() => {
    overlay.querySelectorAll('.metric-card__value').forEach((el) => el.classList.add('animate-counter'));
  }, 400);
}

function renderTextSection(title, content) {
  return `<div class="deep-dive-section"><h3 class="deep-dive-section__title">${title}</h3>${content}</div>`;
}

function renderArchitecture(project) {
  return `<div class="architecture-diagram" tabindex="0" role="img" aria-label="${escapeHtml(project.title)} architecture flow">
    <pre class="architecture-diagram__text">${escapeHtml(project.architecture)}</pre>
  </div>`;
}

function renderAchievements(achievements) {
  return `<ul class="achievements-list">${achievements
    .map(
      (achievement) => `
        <li class="achievements-list__item">
          <span class="achievements-list__check">${renderIcon('check', 'achievements-list__icon')}</span>
          <span class="achievements-list__text">${escapeHtml(achievement)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

function renderMetrics(metrics) {
  return `<div class="metrics-grid">${metrics
    .map(
      (metric) => `
        <div class="metric-card">
          <div class="metric-card__value" data-target="${escapeHtml(metric.value)}">${escapeHtml(metric.value)}</div>
          <div class="metric-card__label">${escapeHtml(metric.label)}</div>
        </div>`
    )
    .join('')}</div>`;
}

function renderTools(tools) {
  return `<div class="tools-grid">${tools
    .map(
      (tool) =>
        `<div class="tool-item"><span class="tool-item__icon">${renderIcon(tool.icon)}</span><span>${escapeHtml(tool.name)}</span></div>`
    )
    .join('')}</div>`;
}

function closeDeepDive() {
  if (!overlay || !isOpen) return;
  overlay.classList.remove('active');
  isOpen = false;
  document.body.style.overflow = '';
  if (previousFocus && typeof previousFocus.focus === 'function' && previousFocus.isConnected) {
    previousFocus.focus();
  }
  previousFocus = null;
}

function focusableInOverlay() {
  if (!overlay) return [];
  return Array.from(
    overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function handleKeydown(event) {
  if (!isOpen) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDeepDive();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = focusableInOverlay();
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  } else if (!overlay.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}
