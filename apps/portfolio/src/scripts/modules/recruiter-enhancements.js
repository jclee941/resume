import { getEvidenceItems, getRecruiterLabels, getRoleProfiles } from './recruiter-enhancements-data.js';
import {
  applyRoleProofCounts,
  countRoleProofs,
  roleProofCountText,
  tagProjectCards,
} from './recruiter-role-proofs.js';
import { renderMobileActionBar } from './recruiter-mobile-actions.js';
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

function renderRoleQuickPaths(labels, proofCounts) {
  if (document.querySelector('.role-quick-paths')) {
    applyRoleProofCounts(proofCounts);
    return;
  }
  const hero = document.querySelector('#hero .hero-content');
  if (!hero) return;
  const roleProfiles = getRoleProfiles();
  const section = document.createElement('section');
  section.className = 'role-quick-paths';
  section.setAttribute('aria-label', labels.quickTitle);
  section.innerHTML = `
    <div class="role-quick-paths__header">
      <h2 class="role-quick-paths__title">${escapeHtml(labels.quickTitle)}</h2>
      <p class="role-quick-paths__desc">${escapeHtml(labels.quickDesc)}</p>
    </div>
    <div class="role-quick-paths__controls" role="group" aria-label="${escapeHtml(labels.quickTitle)}">
      ${roleProfiles
        .map((role) => {
          const countText = roleProofCountText(proofCounts, role.id);
          const accessibleLabel = `${role.label}: ${countText}. ${role.proof}`;
          return `<button type="button" class="role-chip" data-role-filter="${role.id}" aria-pressed="false" aria-label="${escapeHtml(accessibleLabel)}">
          <span class="role-chip__label">${escapeHtml(role.label)}</span>
          <span class="role-chip__count">${escapeHtml(countText)}</span>
          <span class="role-chip__separator" aria-hidden="true"></span>
          <span class="role-chip__proof">${escapeHtml(role.proof)}</span>
        </button>`;
        })
        .join('')}
    </div>
  `;
  hero.appendChild(section);
}

function renderEvidenceMatrix(labels) {
  if (document.querySelector('.project-evidence-matrix')) return;
  const list = document.querySelector('#project-list');
  if (!list) return;
  const roleProfiles = getRoleProfiles();
  const evidenceItems = getEvidenceItems();
  const matrix = document.createElement('section');
  matrix.className = 'project-evidence-matrix';
  matrix.setAttribute('aria-label', labels.matrixTitle);
  matrix.innerHTML = `
    <div class="project-evidence-matrix__header">
      <h3 class="project-evidence-matrix__title">${escapeHtml(labels.matrixTitle)}</h3>
      <p class="project-evidence-matrix__desc">${escapeHtml(labels.matrixDesc)}</p>
    </div>
    <div class="project-evidence-matrix__grid">
      ${evidenceItems
        .map((item) => {
          const role = roleProfiles.find((candidate) => candidate.id === item.roleId);
          return `<article class="project-evidence-card" data-role="${item.roleId}">
          <span class="project-evidence-card__label">${escapeHtml(labels.role)}</span>
          <strong class="project-evidence-card__role">${escapeHtml(role ? role.label : item.roleId)}</strong>
          <span class="project-evidence-card__label">${escapeHtml(labels.evidence)}</span>
          <p class="project-evidence-card__proof">${escapeHtml(item.proof)}</p>
          <a class="project-evidence-card__link" href="#projects" data-evidence-project="${escapeHtml(item.title)}">${escapeHtml(labels.open)}</a>
        </article>`;
        })
        .join('')}
    </div>
  `;
  list.insertAdjacentElement('beforebegin', matrix);
}

function clearRoleFocus(cards) {
  cards.forEach((card) => card.classList.remove('is-role-match', 'is-role-dimmed'));
}

function bindRoleControls(cards) {
  const buttons = Array.from(document.querySelectorAll('.role-chip'));
  buttons.forEach((button) => {
    if (button.dataset.roleFilterBound === 'true') return;
    button.dataset.roleFilterBound = 'true';
    button.addEventListener('click', () => {
      const role = button.getAttribute('data-role-filter') || '';
      buttons.forEach((candidate) =>
        candidate.setAttribute('aria-pressed', String(candidate === button))
      );
      clearRoleFocus(cards);
      cards.forEach((card) => {
        const roles = (card.getAttribute('data-role') || '').split(/\s+/);
        card.classList.add(roles.includes(role) ? 'is-role-match' : 'is-role-dimmed');
      });
      document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bindEvidenceLinks() {
  document.querySelectorAll('[data-evidence-project]').forEach((link) => {
    if (link.dataset.evidenceLinkBound === 'true') return;
    link.dataset.evidenceLinkBound = 'true';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const title = link.getAttribute('data-evidence-project') || '';
      const card = Array.from(document.querySelectorAll('#projects li.project-item')).find((item) =>
        (item.textContent || '').includes(title)
      );
      if (card) {
        const list = document.querySelector('#project-list');
        const moreButton = document.querySelector('.project-more-btn');
        if (
          card.classList.contains('project-item--collapsed') &&
          !list?.classList.contains('is-expanded')
        ) {
          moreButton?.click();
        }
        clearRoleFocus(Array.from(document.querySelectorAll('#projects li.project-item')));
        card.classList.add('is-role-match');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

export function initRecruiterEnhancements() {
  const labels = getRecruiterLabels();
  const cards = tagProjectCards();
  renderRoleQuickPaths(labels, countRoleProofs(cards));
  renderEvidenceMatrix(labels);
  bindRoleControls(cards);
  bindEvidenceLinks();
  renderMobileActionBar(labels);
}
