import { createIconElement } from './project-card-formatting.js';

const MATCH_LABELS = { ko: '역할 일치', en: 'Role match', ja: 'ロール一致' };

function matchLabel() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return MATCH_LABELS.en;
  if (lang.startsWith('ja')) return MATCH_LABELS.ja;
  return MATCH_LABELS.ko;
}

/** @returns {HTMLSpanElement} a check glyph plus the localized "role match" label */
function createMatchBadge() {
  const badge = document.createElement('span');
  badge.className = 'project-role-badge';
  const label = document.createElement('span');
  label.textContent = matchLabel();
  badge.append(createIconElement('check', 'project-role-badge__icon'), label);
  return badge;
}

/**
 * Shows the badge on matching cards and removes it from the rest.
 * @param {Element[]} cards
 * @param {(card: Element) => boolean} isMatch
 */
export function syncMatchBadges(cards, isMatch) {
  cards.forEach((card) => {
    const existing = card.querySelector('.project-role-badge');
    const header = card.querySelector('.project-header');
    if (isMatch(card) && header && !existing) header.prepend(createMatchBadge());
    if (!isMatch(card)) existing?.remove();
  });
}
