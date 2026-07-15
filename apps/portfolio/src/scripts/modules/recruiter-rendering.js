import {
  getEvidenceItems,
  getRoleProfiles,
} from './recruiter-enhancements-data.js';

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function evidenceLinkText(locale, title) {
  if (locale === 'en') return `${title} evidence`;
  if (locale === 'ja') return `${title}の根拠を見る`;
  return `${title} 근거 보기`;
}

export function renderEvidenceMatrix(labels) {
  if (document.querySelector('.project-evidence-matrix')) return;
  const list = document.querySelector('#project-list');
  if (!list) return;
  const roleProfiles = getRoleProfiles();
  const evidenceItems = getEvidenceItems();
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  const locale = lang.startsWith('en') ? 'en' : lang.startsWith('ja') ? 'ja' : 'ko';
  const matrix = document.createElement('section');
  matrix.className = 'project-evidence-matrix';
  matrix.setAttribute('aria-label', labels.matrixTitle);
  const header = createElement('div', 'project-evidence-matrix__header');
  header.append(
    createElement('h3', 'project-evidence-matrix__title', labels.matrixTitle),
    createElement('p', 'project-evidence-matrix__desc', labels.matrixDesc)
  );
  const grid = createElement('div', 'project-evidence-matrix__grid');
  evidenceItems.forEach((item) => {
    const role = roleProfiles.find((candidate) => candidate.id === item.roleId);
    const link = createElement(
      'a',
      'project-evidence-card__link',
      evidenceLinkText(locale, item.title)
    );
    link.href = '#projects';
    link.dataset.evidenceProject = item.title;
    // No aria-label: the visible link text is unique and contextual
    // (WCAG 2.5.3 Label in Name).

    const card = createElement('article', 'project-evidence-card');
    card.dataset.role = item.roleId;
    card.append(
      createElement('span', 'project-evidence-card__label', labels.role),
      createElement('strong', 'project-evidence-card__role', role ? role.label : item.roleId),
      createElement('span', 'project-evidence-card__label', labels.evidence),
      createElement('p', 'project-evidence-card__proof', item.proof),
      link
    );
    grid.appendChild(card);
  });
  matrix.append(header, grid);
  list.insertAdjacentElement('beforebegin', matrix);
}
