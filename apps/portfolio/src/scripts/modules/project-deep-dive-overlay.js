import { createIconElement, getTechClass } from './project-card-formatting.js';
import { createArchitectureElement } from './project-architecture-renderer.js';
import {
  createAchievements,
  createElement,
  createKeyHint,
  createMetrics,
  createPeriod,
  createTools,
} from './project-deep-dive-parts.js';

/**
 * @typedef {Object} DeepDiveMetric
 * @property {string} value
 * @property {string} label
 * @property {string} [icon]
 */

/**
 * @typedef {Object} DeepDiveTool
 * @property {string} icon
 * @property {string} name
 */

/**
 * @typedef {Object} DeepDiveProject
 * @property {string} [id]
 * @property {string} title
 * @property {string} period
 * @property {string} icon
 * @property {string[]} stack
 * @property {DeepDiveMetric[]} metrics
 * @property {string} description
 * @property {string[]} achievements
 * @property {string} architecture
 * @property {DeepDiveTool[]} tools
 */

/** @type {HTMLDivElement | null} */
let overlay = null;
let isOpen = false;
/** @type {HTMLElement | null} */
let previousFocus = null;
let openToken = 0;
let counterTimer = 0;

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

function componentsHeading() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return 'Key components';
  if (lang.startsWith('ja')) return '主な構成要素';
  return '핵심 구성';
}

/**
 * @returns {{ open: (project: DeepDiveProject) => void }}
 */
export function createDeepDiveOverlay() {
  if (overlay) return { open: openDeepDive };

  overlay = document.createElement('div');
  overlay.className = 'deep-dive-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const labels = dialogLabels();
  overlay.setAttribute('aria-label', labels.dialog);
  overlay.inert = true;
  const panel = createElement('div', 'deep-dive-panel');
  const close = createElement('button', 'deep-dive-close');
  close.type = 'button';
  close.setAttribute('aria-label', labels.close);
  close.setAttribute('data-tooltip', '');
  close.appendChild(createIconElement('x', 'deep-dive-close__icon'));
  const content = createElement('div', 'deep-dive-content');
  content.id = 'deep-dive-content';
  const hint = createElement('div', 'keyboard-hint');
  hint.append(createKeyHint('ESC', labels.esc), createKeyHint('Tab', labels.tab));
  panel.append(close, content, hint);
  overlay.appendChild(panel);

  close.addEventListener('click', closeDeepDive);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDeepDive();
  });
  document.addEventListener('keydown', handleKeydown);
  document.body.appendChild(overlay);
  return { open: openDeepDive };
}

/**
 * @param {DeepDiveProject} project
 */
function openDeepDive(project) {
  if (!overlay) return;

  const content = /** @type {HTMLElement} */ (overlay.querySelector('#deep-dive-content'));
  content.replaceChildren(createDeepDiveHeader(project), createDeepDiveBody(project));

  if (!isOpen) previousFocus = /** @type {HTMLElement | null} */ (document.activeElement);
  cancelEntryWork();
  const token = ++openToken;
  overlay.inert = false;
  overlay.scrollTop = 0;
  overlay.classList.add('active');
  isOpen = true;
  document.body.style.overflow = 'hidden';
  /** @type {{ querySelector(s: string): HTMLElement | null }} */ (overlay)
    .querySelector('.deep-dive-close')
    ?.focus({ preventScroll: true });
  counterTimer = window.setTimeout(() => {
    if (token !== openToken || !overlay) return;
    overlay
      .querySelectorAll('.metric-card__value')
      .forEach((el) => el.classList.add('animate-counter'));
  }, 400);
}

function cancelEntryWork() {
  if (!counterTimer) return;
  window.clearTimeout(counterTimer);
  counterTimer = 0;
}

/**
 * @param {DeepDiveProject} project
 * @returns {HTMLDivElement}
 */
function createDeepDiveHeader(project) {
  const header = createElement('div', 'deep-dive-header');
  const icon = createElement('div', 'deep-dive-header__icon');
  icon.appendChild(createIconElement(project.icon));
  const body = createElement('div', 'deep-dive-header__content');
  const tags = createElement('div', 'deep-dive-header__tags');
  project.stack.forEach((tech) => {
    tags.appendChild(createElement('span', `tech-tag tech-tag--${getTechClass(tech)}`, tech));
  });
  body.append(
    createElement('h2', 'deep-dive-header__title', project.title),
    createPeriod(project.period),
    tags
  );
  header.append(icon, body);
  return header;
}

/**
 * @param {DeepDiveProject} project
 * @returns {HTMLDivElement}
 */
function createDeepDiveBody(project) {
  const body = createElement('div', 'deep-dive-content');
  body.append(
    createTextSection(
      '개요',
      createElement('p', 'project-detail__description', project.description)
    ),
    createTextSection('주요 성과', createAchievements(project.achievements)),
    createTextSection(componentsHeading(), createMetrics(project.metrics)),
    createTextSection('구성 흐름', createArchitectureElement(project)),
    createTextSection('사용 도구', createTools(project.tools))
  );
  return body;
}

/**
 * @param {string} title
 * @param {HTMLElement} content
 * @returns {HTMLDivElement}
 */
function createTextSection(title, content) {
  const section = createElement('div', 'deep-dive-section');
  section.append(createElement('h3', 'deep-dive-section__title', title), content);
  return section;
}

function closeDeepDive() {
  if (!overlay || !isOpen) return;
  openToken += 1;
  cancelEntryWork();
  overlay.classList.remove('active');
  overlay.inert = true;
  isOpen = false;
  document.body.style.overflow = '';
  const launcher = previousFocus;
  previousFocus = null;
  if (launcher && typeof launcher.focus === 'function' && launcher.isConnected) {
    launcher.focus();
  }
}

/**
 * @returns {HTMLElement[]}
 */
function focusableInOverlay() {
  if (!overlay) return [];
  return /** @type {HTMLElement[]} */ (
    Array.from(
      overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    )
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/**
 * @param {KeyboardEvent} event
 */
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
  } else if (!(/** @type {NonNullable<typeof overlay>} */ (overlay).contains(active))) {
    event.preventDefault();
    first.focus();
  }
}
