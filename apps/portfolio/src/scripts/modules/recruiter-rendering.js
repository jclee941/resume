import {
  getEvidenceItems,
  getRoleProfiles,
} from './recruiter-enhancements-data.js';
import {
  applyRoleProofCounts,
  roleProofCountText,
} from './recruiter-role-proofs.js';

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function appendRoleChip(controls, role, countText) {
  const chip = createElement('button', 'role-chip');
  chip.type = 'button';
  chip.dataset.roleFilter = role.id;
  chip.disabled = true;
  chip.setAttribute('aria-pressed', 'false');
  chip.setAttribute('aria-label', `${role.label}: ${countText}. ${role.proof}`);

  chip.append(
    createElement('span', 'role-chip__label', role.label),
    createElement('span', 'role-chip__count', countText)
  );
  const separator = createElement('span', 'role-chip__separator');
  separator.setAttribute('aria-hidden', 'true');
  chip.append(separator, createElement('span', 'role-chip__proof', role.proof));
  controls.appendChild(chip);
}

function evidenceLinkText(locale, title) {
  if (locale === 'en') return `${title} proof`;
  if (locale === 'ja') return `${title}の根拠を見る`;
  return `${title} 근거 보기`;
}

function evidenceLinkLabel(locale, title) {
  if (locale === 'en') return `Open ${title} project proof`;
  if (locale === 'ja') return `${title}プロジェクトの根拠を見る`;
  return `${title} 프로젝트 근거 보기`;
}

function ensureRoleStatus(section) {
  const status = section.querySelector('[data-role-status]');
  if (status) return status;
  const roleControls = section.querySelector('.role-quick-paths__controls');
  const createdStatus = document.createElement('p');
  createdStatus.className = 'role-quick-paths__status selected-role-status';
  createdStatus.setAttribute('data-role-status', '');
  createdStatus.setAttribute('aria-live', 'polite');
  createdStatus.setAttribute('aria-atomic', 'true');
  roleControls?.insertAdjacentElement('afterend', createdStatus);
  return createdStatus;
}

export function renderRoleQuickPaths(labels, proofCounts) {
  const existingSection = document.querySelector('.role-quick-paths');
  if (existingSection) {
    applyRoleProofCounts(proofCounts);
    ensureRoleStatus(existingSection);
    return;
  }
  const hero = document.querySelector('#hero .hero-content');
  if (!hero) return;
  const roleProfiles = getRoleProfiles();
  const section = document.createElement('section');
  section.className = 'role-quick-paths';
  section.setAttribute('aria-label', labels.quickTitle);
  const header = createElement('div', 'role-quick-paths__header');
  header.append(
    createElement('h2', 'role-quick-paths__title', labels.quickTitle),
    createElement('p', 'role-quick-paths__desc', labels.quickDesc)
  );
  const controls = createElement('div', 'role-quick-paths__controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', labels.quickTitle);
  roleProfiles.forEach((role) =>
    appendRoleChip(controls, role, roleProofCountText(proofCounts, role.id))
  );
  const status = createElement('p', 'role-quick-paths__status selected-role-status');
  status.setAttribute('data-role-status', '');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  section.append(header, controls, status);
  hero.appendChild(section);
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
    link.setAttribute('aria-label', evidenceLinkLabel(locale, item.title));

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
