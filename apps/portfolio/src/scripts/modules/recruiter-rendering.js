import { getRoleProfiles } from './recruiter-enhancements-data.js';
import { applyRoleProofCounts, roleProofCountText } from './recruiter-role-proofs.js';

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

/**
 * @param {HTMLElement} controls
 * @param {ReturnType<typeof getRoleProfiles>[number]} role
 * @param {string} countText
 */
function appendRoleChip(controls, role, countText) {
  const chip = createElement('button', 'role-chip');
  chip.type = 'button';
  chip.dataset.roleFilter = role.id;
  chip.disabled = true;
  chip.setAttribute('aria-pressed', 'false');
  // No aria-label: the accessible name comes from the visible
  // label/count/proof spans (WCAG 2.5.3 Label in Name).

  chip.append(
    createElement('span', 'role-chip__label', role.label),
    createElement('span', 'role-chip__count', countText)
  );
  const separator = createElement('span', 'role-chip__separator');
  separator.setAttribute('aria-hidden', 'true');
  chip.append(separator, createElement('span', 'role-chip__proof', role.proof));
  controls.appendChild(chip);
}

/**
 * @param {Element} section
 * @returns {Element}
 */
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

/**
 * @param {ReturnType<import('./recruiter-enhancements-data.js').getRecruiterLabels>} labels
 * @param {Map<string, number>} proofCounts
 */
export function renderRoleQuickPaths(labels, proofCounts) {
  const existingSection = document.querySelector('.role-quick-paths');
  if (existingSection) {
    applyRoleProofCounts(proofCounts);
    ensureRoleStatus(existingSection);
    return;
  }
  const projectList = document.querySelector('#project-list');
  if (!projectList) return;
  const roleProfiles = getRoleProfiles();
  const section = document.createElement('section');
  section.className = 'role-quick-paths';
  section.setAttribute('aria-label', labels.quickTitle);
  const header = createElement('div', 'role-quick-paths__header');
  header.append(
    createElement('h3', 'role-quick-paths__title', labels.quickTitle),
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
  projectList.insertAdjacentElement('beforebegin', section);
}
