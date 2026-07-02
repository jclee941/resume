import { createIconElement, getTechClass } from './project-card-formatting.js';
import { createArchitectureElement } from './project-architecture-renderer.js';

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

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function createDeepDiveOverlay() {
  if (overlay) return { open: openDeepDive };

  overlay = document.createElement('div');
  overlay.className = 'deep-dive-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const labels = dialogLabels();
  overlay.setAttribute('aria-label', labels.dialog);
  const panel = createElement('div', 'deep-dive-panel');
  const close = createElement('button', 'deep-dive-close');
  close.type = 'button';
  close.setAttribute('aria-label', labels.close);
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

function openDeepDive(project) {
  if (!overlay) return;

  const content = overlay.querySelector('#deep-dive-content');
  content.replaceChildren(createDeepDiveHeader(project), createDeepDiveBody(project));

  previousFocus = document.activeElement;
  overlay.classList.add('active');
  isOpen = true;
  document.body.style.overflow = 'hidden';
  const focusCloseButton = () => {
    overlay?.querySelector('.deep-dive-close')?.focus({ preventScroll: true });
  };
  window.setTimeout(focusCloseButton, 0);
  window.setTimeout(focusCloseButton, 120);
  window.setTimeout(() => {
    overlay
      .querySelectorAll('.metric-card__value')
      .forEach((el) => el.classList.add('animate-counter'));
  }, 400);
}

function createKeyHint(key, text) {
  const hint = createElement('span', 'key-hint');
  hint.append(createElement('span', 'key-hint__key', key), document.createTextNode(` ${text}`));
  return hint;
}

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
    createElement('div', 'deep-dive-header__period', project.period),
    tags
  );
  header.append(icon, body);
  return header;
}

function createDeepDiveBody(project) {
  const body = createElement('div', 'deep-dive-content');
  body.append(
    createTextSection('개요', createElement('p', 'project-detail__description', project.description)),
    createTextSection('주요 성과', createAchievements(project.achievements)),
    createTextSection('메트릭스', createMetrics(project.metrics)),
    createTextSection('구성 흐름', createArchitectureElement(project)),
    createTextSection('사용 도구', createTools(project.tools))
  );
  return body;
}

function createTextSection(title, content) {
  const section = createElement('div', 'deep-dive-section');
  section.append(createElement('h3', 'deep-dive-section__title', title), content);
  return section;
}

function createAchievements(achievements) {
  const list = createElement('ul', 'achievements-list');
  achievements.forEach((achievement) => {
    const item = createElement('li', 'achievements-list__item');
    const check = createElement('span', 'achievements-list__check');
    check.appendChild(createIconElement('check', 'achievements-list__icon'));
    item.append(check, createElement('span', 'achievements-list__text', achievement));
    list.appendChild(item);
  });
  return list;
}

function createMetrics(metrics) {
  const grid = createElement('div', 'metrics-grid');
  metrics.forEach((metric) => {
    const card = createElement('div', 'metric-card');
    const value = createElement('div', 'metric-card__value', metric.value);
    value.dataset.target = metric.value;
    card.append(value, createElement('div', 'metric-card__label', metric.label));
    grid.appendChild(card);
  });
  return grid;
}

function createTools(tools) {
  const grid = createElement('div', 'tools-grid');
  tools.forEach((tool) => {
    const item = createElement('div', 'tool-item');
    const icon = createElement('span', 'tool-item__icon');
    icon.appendChild(createIconElement(tool.icon));
    item.append(icon, createElement('span', '', tool.name));
    grid.appendChild(item);
  });
  return grid;
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
