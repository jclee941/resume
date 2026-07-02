import { PROJECTS } from './project-cards-data.js';
import { createDeepDiveOverlay } from './project-deep-dive-overlay.js';
import { createIconElement, getTechClass } from './project-card-formatting.js';

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function currentLanguage() {
  return (document.documentElement.lang || 'ko').toLowerCase();
}

function caseStudyCopy(lang) {
  if (lang.startsWith('en')) {
    return {
      title: 'Operational case studies',
      description:
        'Review selected projects again through operating context, evidence, and architecture flow.',
      gridLabel: 'Case studies',
      cta: 'Review details',
    };
  }
  if (lang.startsWith('ja')) {
    return {
      title: '運用事例の詳細',
      description:
        '選定プロジェクトを、運用背景・証跡・構成フローの観点でもう一度確認できます。',
      gridLabel: 'ケーススタディ',
      cta: '詳細を見る',
    };
  }
  return {
    title: '운영 사례 심층 검토',
    description:
      '프로젝트 목록에서 선별한 사례를 운영 맥락, 증거, 구성 흐름 기준으로 다시 볼 수 있습니다.',
    gridLabel: '케이스 스터디',
    cta: '상세 검토',
  };
}

function resolveMount() {
  const caseStudyList = document.querySelector('.case-study-list');
  if (caseStudyList) return { mode: 'replace', target: caseStudyList };

  const lang = currentLanguage();
  const projectList = document.querySelector('#project-list');
  if (lang.startsWith('ko') && projectList) return { mode: 'after', target: projectList };
  return null;
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
  header.append(heading, createElement('p', 'case-study-deep-dives__description', copy.description));
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

function createProjectCard(project, index, openDeepDive, copy) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('data-project-id', project.id);
  card.style.animationDelay = `${index * 0.1}s`;

  const header = createElement('div', 'project-card__header');
  const icon = createElement('div', 'project-card__icon');
  icon.appendChild(createIconElement(project.icon));
  const titleGroup = createElement('div', 'project-card__title-group');
  titleGroup.append(
    createElement('h3', 'project-card__title', project.title),
    createElement('div', 'project-card__period', project.period)
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
    metricIcon.appendChild(createIconElement(metric.icon));
    preview.append(
      metricIcon,
      createElement('span', 'metric-preview__value', `${metric.value} ${metric.label}`)
    );
    metrics.appendChild(preview);
  });

  const cta = createElement('div', 'project-card__cta');
  cta.append(createElement('span', '', copy.cta), createElement('span', 'project-card__cta-icon', '→'));
  card.append(header, stack, metrics, cta);

  card.addEventListener('click', () => openDeepDive(project));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDeepDive(project);
    }
  });
  return card;
}
