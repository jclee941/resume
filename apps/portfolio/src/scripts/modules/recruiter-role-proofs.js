import { ROLE_PROFILES, getProofCountLabel } from './recruiter-enhancements-data.js';

function roleIdsForText(text) {
  return ROLE_PROFILES.filter((role) =>
    role.keywords.some((keyword) => text.includes(keyword))
  ).map((role) => role.id);
}

export function tagProjectCards() {
  const cards = Array.from(document.querySelectorAll('#projects li.project-item'));
  cards.forEach((card) => {
    const text = card.textContent || '';
    const roles = roleIdsForText(text);
    if (roles.length > 0) card.setAttribute('data-role', roles.join(' '));
  });
  return cards;
}

export function countRoleProofs(cards) {
  const counts = new Map(ROLE_PROFILES.map((role) => [role.id, 0]));
  cards.forEach((card) => {
    const roleIds = (card.getAttribute('data-role') || '').split(/\s+/).filter(Boolean);
    roleIds.forEach((roleId) => counts.set(roleId, (counts.get(roleId) || 0) + 1));
  });
  return counts;
}

export function roleProofCountText(proofCounts, roleId) {
  return getProofCountLabel(proofCounts.get(roleId) || 0);
}

export function applyRoleProofCounts(proofCounts) {
  document.querySelectorAll('.role-chip').forEach((button) => {
    const roleId = button.getAttribute('data-role-filter') || '';
    const countText = roleProofCountText(proofCounts, roleId);
    const labelText = button.querySelector('.role-chip__label')?.textContent?.trim() || roleId;
    const proofText = button.querySelector('.role-chip__proof')?.textContent?.trim() || '';
    button.setAttribute('aria-label', `${labelText}: ${countText}. ${proofText}`);

    const existingCount = button.querySelector('.role-chip__count');
    if (existingCount) {
      existingCount.textContent = countText;
      return;
    }
    const count = document.createElement('span');
    count.className = 'role-chip__count';
    count.textContent = countText;
    button.querySelector('.role-chip__label')?.insertAdjacentElement('afterend', count);
  });
}
