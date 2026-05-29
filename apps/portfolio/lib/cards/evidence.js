'use strict';

const { escapeHtml } = require('../template-sanitizer');

/**
 * Generate an "achievements" evidence section surfacing the real SSoT
 * `achievements[]` array that was previously unsurfaced on the live
 * portfolio. Rendered as terminal-style evidence cards.
 *
 * @param {Object} data - data.json (uses `achievements[]` of strings).
 * @returns {string} HTML for the achievements list, or '' if nothing to show.
 */
function generateAchievementsSection(data) {
  if (!data || !Array.isArray(data.achievements)) return '';
  const items = data.achievements
    .filter((a) => typeof a === 'string' && a.trim().length > 0)
    .map(
      (a) =>
        `<li class="achievement-card"><span class="achievement-card__marker">&gt;</span> ${escapeHtml(
          String(a)
        )}</li>`
    );
  if (items.length === 0) return '';
  return `<ul class="achievements-list">
      ${items.join('\n      ')}
    </ul>`;
}

module.exports = { generateAchievementsSection };
