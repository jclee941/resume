'use strict';

const { escapeHtml } = require('../template-sanitizer');

/**
 * Generate an "achievements" evidence section surfacing the real SSoT
 * `achievements[]` array that was previously unsurfaced on the live
 * portfolio. Rendered as clean evidence cards.
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

/**
 * Generate an "expertise / core competencies" section surfacing the real
 * SSoT `summary.expertise` (keyword tags) and `summary.coreCompetencies`
 * (experience bullets) that were previously unsurfaced on the live portfolio.
 *
 * @param {Object} data - data.json (uses `expertise[]`, `coreCompetencies[]`).
 * @returns {string} HTML, or '' if nothing to show.
 */
function generateExpertiseSection(data) {
  if (!data) return '';
  const expertise = Array.isArray(data.expertise)
    ? data.expertise.filter((e) => typeof e === 'string' && e.trim().length > 0)
    : [];
  const competencies = Array.isArray(data.coreCompetencies)
    ? data.coreCompetencies.filter((c) => typeof c === 'string' && c.trim().length > 0)
    : [];
  if (expertise.length === 0 && competencies.length === 0) return '';

  let html = '';
  if (expertise.length > 0) {
    const tags = expertise
      .map((e) => `<span class="expertise-tag">${escapeHtml(String(e))}</span>`)
      .join('\n          ');
    html += `<div class="about-subsection about-subsection--expertise">
      <h3 class="about-subsection__heading">&gt; expertise</h3>
      <div class="expertise-tags">\n          ${tags}\n      </div>
    </div>`;
  }
  if (competencies.length > 0) {
    const items = competencies
      .map(
        (c) =>
          `<li class="competency-item"><span class="competency-item__marker">&gt;</span> ${escapeHtml(
            String(c)
          )}</li>`
      )
      .join('\n          ');
    html += `\n      <div class="about-subsection about-subsection--competencies">
      <h3 class="about-subsection__heading">&gt; core_competencies</h3>
      <ul class="competency-list">\n          ${items}\n      </ul>
    </div>`;
  }
  return html;
}

module.exports = { generateAchievementsSection, generateExpertiseSection };
