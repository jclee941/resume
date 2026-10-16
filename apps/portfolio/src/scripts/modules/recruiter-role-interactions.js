import { getRoleProfiles } from './recruiter-enhancements-data.js';
import { roleProofCountText } from './recruiter-role-proofs.js';
import { flipReorder, scrollBehavior } from './recruiter-role-motion.js';
import { syncMatchBadges } from './recruiter-match-badge.js';

/**
 * @param {Element[]} cards
 */
function clearRoleFocus(cards) {
  cards.forEach((card) => card.classList.remove('is-role-match', 'is-role-dimmed'));
}

/**
 * @param {Element} card
 * @returns {number}
 */
function getOriginalIndex(card) {
  return Number.parseInt(card.getAttribute('data-original-index') || '0', 10);
}

/**
 * @param {Element[]} cards
 */
function recordOriginalOrder(cards) {
  cards.forEach((card, index) => {
    if (card.getAttribute('data-original-index') === null) {
      card.setAttribute('data-original-index', String(index));
    }
  });
}

/**
 * @param {Element} card
 * @param {string} role
 * @returns {boolean}
 */
function cardMatchesRole(card, role) {
  const roles = (card.getAttribute('data-role') || '').split(/\s+/).filter(Boolean);
  return roles.includes(role);
}

/**
 * @param {Element[]} orderedCards
 */
function applyCardOrder(orderedCards) {
  const list = orderedCards[0]?.parentElement;
  if (!list) return;
  orderedCards.forEach((card) => {
    list.appendChild(card);
  });
  list.scrollLeft = 0;
}

/**
 * @param {Element[]} cards
 * @param {string} [role]
 * @returns {Element[]}
 */
function reorderCardsForRole(cards, role) {
  const sortedByOriginal = [...cards].sort(
    (left, right) => getOriginalIndex(left) - getOriginalIndex(right)
  );
  if (!role) {
    applyCardOrder(sortedByOriginal);
    return sortedByOriginal;
  }
  const matches = sortedByOriginal.filter((card) => cardMatchesRole(card, role));
  const nonMatches = sortedByOriginal.filter((card) => !cardMatchesRole(card, role));
  const ordered = [...matches, ...nonMatches];
  applyCardOrder(ordered);
  return ordered;
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

function clearRoleHistoryState() {
  if (!window.history?.replaceState) return;
  const currentState =
    window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
  const nextState = { ...currentState };
  delete nextState.selectedRole;
  delete nextState.selectedRoleLabel;
  window.history.replaceState(nextState, '', window.location.href);
}

/**
 * @param {Element[]} cards
 */
function scrollCarouselToStart(cards) {
  const list = cards[0]?.parentElement;
  if (!list || list.scrollWidth <= list.clientWidth) return;
  list.scrollTo?.({ left: 0, behavior: scrollBehavior() });
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
  if (!match) {
    list.scrollTo?.({ left: 0, behavior: scrollBehavior() });
    return;
  }
  const offset = match.getBoundingClientRect().left - list.getBoundingClientRect().left;
  list.scrollTo({ left: list.scrollLeft + offset, behavior: scrollBehavior() });
}

/**
 * @param {Element[]} cards
 * @param {Map<string, number>} proofCounts
 */
export function bindRoleControls(cards, proofCounts) {
  recordOriginalOrder(cards);
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
        const list = cards[0]?.parentElement;
        if (button.getAttribute('aria-pressed') === 'true') {
          buttons.forEach((candidate) => candidate.setAttribute('aria-pressed', 'false'));
          const restore = () => {
            clearRoleFocus(cards);
            syncMatchBadges(cards, () => false);
            reorderCardsForRole(cards);
          };
          if (list) flipReorder(list, cards, restore);
          else restore();
          if (status) status.textContent = '';
          clearRoleHistoryState();
          scrollCarouselToStart(cards);
          return;
        }
        buttons.forEach((candidate) =>
          candidate.setAttribute('aria-pressed', String(candidate === button))
        );
        /** @type {Element[]} */
        let orderedCards = cards;
        const select = () => {
          clearRoleFocus(cards);
          cards.forEach((card) => {
            card.classList.add(cardMatchesRole(card, role) ? 'is-role-match' : 'is-role-dimmed');
          });
          syncMatchBadges(cards, (card) => cardMatchesRole(card, role));
          orderedCards = reorderCardsForRole(cards, role);
          scrollCarouselToFirstMatch(orderedCards);
        };
        if (list) flipReorder(list, cards, select);
        else select();
        const visibleLabel =
          button.querySelector('.role-chip__label')?.textContent?.trim() || roleProfile.label;
        const selectedRole = { ...roleProfile, label: visibleLabel };
        if (status) {
          status.textContent = selectedRoleStatusText(
            selectedRole,
            roleProofCountText(proofCounts, role)
          );
        }
        setRoleHistoryState(selectedRole);
        document
          .querySelector('#projects')
          ?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      });
    }
    button.disabled = false;
  });
}
