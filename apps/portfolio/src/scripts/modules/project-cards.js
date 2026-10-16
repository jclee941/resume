import { PROJECTS } from './project-cards-data.js';
import { createDeepDiveOverlay } from './project-deep-dive-overlay.js';
import { createIconElement, getTechClass } from './project-card-formatting.js';

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElementTagNameMap[K]}
 */
function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function currentLanguage() {
  return (document.documentElement.lang || 'ko').toLowerCase();
}

/**
 * @typedef {{ title: string, description: string, gridLabel: string, cta: string }} CaseStudyCopy
 */

/**
 * @param {string} lang
 * @returns {CaseStudyCopy}
 */
function caseStudyCopy(lang) {
  if (lang.startsWith('en')) {
    return {
      title: 'Operational case studies',
      description:
        'A closer look at selected projects: the operating context and how each was built.',
      gridLabel: 'Case studies',
      cta: 'Review details',
    };
  }
  if (lang.startsWith('ja')) {
    return {
      title: '運用事例の詳細',
      description: '選定したプロジェクトの運用背景と構成を詳しくまとめました。',
      gridLabel: 'ケーススタディ',
      cta: '詳細を見る',
    };
  }
  return {
    title: '운영 사례 심층 검토',
    description: '선별한 프로젝트의 운영 맥락과 구성을 자세히 정리했습니다.',
    gridLabel: '케이스 스터디',
    cta: '상세 검토',
  };
}

function resolveMount() {
  const caseStudyList = document.querySelector('.case-study-list');
  if (caseStudyList) return { mode: 'replace', target: caseStudyList };

  const lang = currentLanguage();
  const projectList = document.querySelector('#project-list');
  if (!lang.startsWith('ko') || !projectList) return null;
  const more = projectList.nextElementSibling;
  const afterMore = more?.classList.contains('project-more') ? more : projectList;
  return { mode: 'after', target: afterMore };
}

export function initProjectCards() {
  const mount = resolveMount();
  if (!mount) return;

  const copy = caseStudyCopy(currentLanguage());
  const overlay = createDeepDiveOverlay();
  const section = document.createElement('section');
  section.className = 'case-study-deep-dives';
  section.setAttribute('aria-labelledby', 'case-study-heading');
  const header = createElement('div', 'case-study-deep-dives__header');
  const heading = createElement('h2', 'case-study-deep-dives__title', copy.title);
  heading.id = 'case-study-heading';
  header.append(
    heading,
    createElement('p', 'case-study-deep-dives__description', copy.description)
  );
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'project-cards-grid';
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', copy.gridLabel);

  PROJECTS.forEach((project, index) => {
    grid.appendChild(createProjectCard(project, index, overlay.open, copy));
  });
  section.appendChild(grid);

  if (mount.mode === 'replace') {
    mount.target.replaceWith(section);
  } else {
    mount.target.insertAdjacentElement('afterend', section);
  }

  requestAnimationFrame(() => {
    grid.querySelectorAll('.project-card').forEach((card, index) => {
      window.setTimeout(() => card.classList.add('animate-in'), index * 100);
    });
  });
}

const LOCALIZED_WORD = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu;

/**
 * Numerals and separators keep the period's mono face; localized words such as the open-ended
 * "current" marker get their own span so they render in the label face.
 * @param {string} period
 * @returns {HTMLDivElement}
 */
export function createPeriod(period) {
  const element = createElement('div', 'project-card__period');
  let last = 0;
  for (const match of period.matchAll(LOCALIZED_WORD)) {
    if (match.index > last) element.append(period.slice(last, match.index));
    element.appendChild(createElement('span', 'project-card__period-word', match[0]));
    last = match.index + match[0].length;
  }
  if (last < period.length) element.append(period.slice(last));
  return element;
}

/**
 * @typedef {import('./project-deep-dive-overlay.js').DeepDiveProject & { id: string, metrics: Array<import('./project-deep-dive-overlay.js').DeepDiveMetric & { icon: string }> }} ProjectCardItem
 */

/**
 * @param {ProjectCardItem} project
 * @param {number} index
 * @param {(project: import('./project-deep-dive-overlay.js').DeepDiveProject) => void} openDeepDive
 * @param {CaseStudyCopy} copy
 * @returns {HTMLDivElement}
 */
export function createProjectCard(project, index, openDeepDive, copy) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('data-project-id', project.id);
  card.style.animationDelay = `${index * 0.1}s`;

  const header = createElement('div', 'project-card__header');
  const icon = createElement('div', 'project-card__icon');
  icon.appendChild(createIconElement(project.icon));
  const titleGroup = createElement('div', 'project-card__title-group');
  titleGroup.append(
    createElement('h3', 'project-card__title', project.title),
    createPeriod(project.period)
  );
  header.append(icon, titleGroup);

  const stack = createElement('div', 'project-card__stack');
  project.stack.forEach((tech) => {
    stack.appendChild(createElement('span', `tech-tag tech-tag--${getTechClass(tech)}`, tech));
  });

  const metrics = createElement('div', 'project-card__metrics');
  project.metrics.forEach((metric) => {
    const preview = createElement('div', 'metric-preview');
    const metricIcon = createElement('span', 'metric-preview__icon');
    metricIcon.appendChild(createIconElement(/** @type {string} */ (metric.icon)));
    preview.append(
      metricIcon,
      createElement('span', 'metric-preview__value', `${metric.value} ${metric.label}`)
    );
    metrics.appendChild(preview);
  });

  const launcher = createElement('button', 'project-card__launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-label', `${copy.cta}: ${project.title}`);
  const ctaIcon = createElement('span', 'project-card__cta-icon', '→');
  ctaIcon.setAttribute('aria-hidden', 'true');
  launcher.append(createElement('span', '', copy.cta), ctaIcon);
  launcher.addEventListener('click', () => openDeepDive(project));
  const cta = createElement('div', 'project-card__cta');
  cta.appendChild(launcher);
  card.append(header, stack, metrics, cta);
  return card;
}
