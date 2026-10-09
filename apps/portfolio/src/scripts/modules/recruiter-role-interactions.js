import { getRoleProfiles } from './recruiter-enhancements-data.js';
import { roleProofCountText } from './recruiter-role-proofs.js';

/**
 * @param {Element[]} cards
 */
function clearRoleFocus(cards) {
  cards.forEach((card) => card.classList.remove('is-role-match', 'is-role-dimmed'));
}

/**
 * @param {{ id: string, label: string }} role
 * @param {string} countText
 * @returns {string}
 */
function selectedRoleStatusText(role, countText) {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return `${role.label} selected: ${countText}.`;
  if (lang.startsWith('ja')) return `${role.label}を選択: ${countText}`;
  return `${role.label} 선택됨: ${countText}`;
}

/**
 * @param {{ id: string, label: string }} role
 */
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

/**
 * On phones the project list scrolls sideways; bring the first visible match into view.
 * @param {Element[]} cards
 */
function scrollCarouselToFirstMatch(cards) {
  const list = cards[0]?.parentElement;
  if (!list || list.scrollWidth <= list.clientWidth) return;
  const match = cards.find(
    (card) => card.classList.contains('is-role-match') && card.getClientRects().length > 0
  );
  if (!match) return;
  const offset = match.getBoundingClientRect().left - list.getBoundingClientRect().left;
  list.scrollTo({ left: list.scrollLeft + offset, behavior: 'smooth' });
}

/**
 * @param {Element[]} cards
 * @param {Map<string, number>} proofCounts
 */
export function bindRoleControls(cards, proofCounts) {
  const buttons = /** @type {HTMLButtonElement[]} */ (
    Array.from(document.querySelectorAll('.role-chip'))
  );
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
        /** @type {NonNullable<typeof status>} */ (status).textContent = selectedRoleStatusText(
          selectedRole,
          roleProofCountText(proofCounts, role)
        );
        setRoleHistoryState(selectedRole);
        document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        scrollCarouselToFirstMatch(cards);
      });
    }
    button.disabled = false;
  });
}
