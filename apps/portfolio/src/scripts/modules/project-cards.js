import { PROJECTS } from './project-cards-data.js';
import { createDeepDiveOverlay } from './project-deep-dive-overlay.js';
import { escapeHtml, getTechClass, renderIcon } from './project-card-formatting.js';

function currentLanguage() {
  return (document.documentElement.lang || 'ko').toLowerCase();
}

function gridLabel(lang) {
  if (lang.startsWith('en')) return 'Case studies';
  if (lang.startsWith('ja')) return 'ケーススタディ';
  return '케이스 스터디';
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

  const overlay = createDeepDiveOverlay();
  const grid = document.createElement('div');
  grid.className = 'project-cards-grid';
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', gridLabel(currentLanguage()));

  PROJECTS.forEach((project, index) => {
    grid.appendChild(createProjectCard(project, index, overlay.open));
  });

  if (mount.mode === 'replace') {
    mount.target.replaceWith(grid);
  } else {
    mount.target.insertAdjacentElement('afterend', grid);
  }

  requestAnimationFrame(() => {
    grid.querySelectorAll('.project-card').forEach((card, index) => {
      window.setTimeout(() => card.classList.add('animate-in'), index * 100);
    });
  });
}

function createProjectCard(project, index, openDeepDive) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('data-project-id', project.id);
  card.style.animationDelay = `${index * 0.1}s`;
  card.innerHTML = `
    <div class="project-card__header">
      <div class="project-card__icon">${renderIcon(project.icon)}</div>
      <div class="project-card__title-group">
        <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
        <div class="project-card__period">${escapeHtml(project.period)}</div>
      </div>
    </div>
    <div class="project-card__stack">
      ${project.stack.map((tech) => `<span class="tech-tag tech-tag--${getTechClass(tech)}">${escapeHtml(tech)}</span>`).join('')}
    </div>
    <div class="project-card__metrics">
      ${project.metrics
        .map(
          (metric) => `
        <div class="metric-preview">
          <span class="metric-preview__icon">${renderIcon(metric.icon)}</span>
          <span class="metric-preview__value">${escapeHtml(metric.value)} ${escapeHtml(metric.label)}</span>
        </div>`
        )
        .join('')}
    </div>
    <div class="project-card__cta">
      <span>Deep Dive</span>
      <span class="project-card__cta-icon">→</span>
    </div>`;

  card.addEventListener('click', () => openDeepDive(project));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDeepDive(project);
    }
  });
  return card;
}
