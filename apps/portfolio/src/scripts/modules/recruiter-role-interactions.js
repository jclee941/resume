import { getRoleProfiles } from './recruiter-enhancements-data.js';
import { roleProofCountText } from './recruiter-role-proofs.js';

function clearRoleFocus(cards) {
  cards.forEach((card) => card.classList.remove('is-role-match', 'is-role-dimmed'));
}

function selectedRoleStatusText(role, countText) {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return `${role.label} selected: ${countText}.`;
  if (lang.startsWith('ja')) return `${role.label}を選択: ${countText}`;
  return `${role.label} 선택됨: ${countText}`;
}

function setRoleHistoryState(role) {
  if (!window.history?.pushState) {
    window.location.hash = 'projects';
    return;
  }
  const currentState =
    window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
  const url = new URL(window.location.href);
  url.hash = 'projects';
  window.history.pushState(
    {
      ...currentState,
      selectedRole: role.id,
      selectedRoleLabel: role.label,
      projectAnchor: 'projects',
    },
    '',
    url
  );
}

export function bindRoleControls(cards, proofCounts) {
  const buttons = Array.from(document.querySelectorAll('.role-chip'));
  const roleProfiles = getRoleProfiles();
  const status = document.querySelector('[data-role-status]');
  buttons.forEach((button) => {
    if (button.dataset.roleFilterBound !== 'true') {
      button.dataset.roleFilterBound = 'true';
      button.addEventListener('click', () => {
        const role = button.getAttribute('data-role-filter') || '';
        const roleProfile = roleProfiles.find((candidate) => candidate.id === role);
        if (!roleProfile) return;
        buttons.forEach((candidate) =>
          candidate.setAttribute('aria-pressed', String(candidate === button))
        );
        clearRoleFocus(cards);
        cards.forEach((card) => {
          const roles = (card.getAttribute('data-role') || '').split(/\s+/);
          card.classList.add(roles.includes(role) ? 'is-role-match' : 'is-role-dimmed');
        });
        const visibleLabel =
          button.querySelector('.role-chip__label')?.textContent?.trim() || roleProfile.label;
        const selectedRole = { ...roleProfile, label: visibleLabel };
        status.textContent = selectedRoleStatusText(
          selectedRole,
          roleProofCountText(proofCounts, role)
        );
        setRoleHistoryState(selectedRole);
        document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    button.disabled = false;
  });
}

export function bindEvidenceLinks() {
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
