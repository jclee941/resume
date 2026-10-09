'use strict';

const { escapeHtml } = require('../template-sanitizer');

const EXPERTISE_LABELS = {
  ko: { expertise: '전문 분야' },
  en: { expertise: 'Areas of expertise' },
  ja: { expertise: '専門分野' },
};

/**
 * @param {unknown} [locale]
 * @returns {'ko' | 'en' | 'ja'}
 */
function normalizeExpertiseLocale(locale) {
  return Object.prototype.hasOwnProperty.call(EXPERTISE_LABELS, /** @type {string} */ (locale))
    ? /** @type {'ko' | 'en' | 'ja'} */ (locale)
    : 'en';
}

/**
 * @typedef {Object} EvidenceData
 * @property {string[]} [achievements]
 * @property {string[]} [expertise]
 * @property {string[]} [coreCompetencies]
 */

/**
 * Generate an "achievements" evidence section surfacing the real SSoT
 * `achievements[]` array that was previously unsurfaced on the live
 * portfolio. Rendered as clean evidence cards.
 *
 * @param {EvidenceData | null | undefined} data - data.json (uses `achievements[]` of strings).
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
 * Generate the "areas of expertise" tags from the SSoT `summary.expertise`.
 * `summary.coreCompetencies` stays in the SSoT but is not rendered here: its
 * bullets repeat the experience and project achievements shown above.
 *
 * @param {EvidenceData | null | undefined} data - data.json (uses `expertise[]`).
 * @param {string} [locale='en'] - Locale for generated section headings.
 * @returns {string} HTML, or '' if nothing to show.
 */
function generateExpertiseSection(data, locale = 'en') {
  if (!data) return '';
  const expertise = Array.isArray(data.expertise)
    ? data.expertise.filter((e) => typeof e === 'string' && e.trim().length > 0)
    : [];
  if (expertise.length === 0) return '';
  const labels = EXPERTISE_LABELS[normalizeExpertiseLocale(locale)];
  const tags = expertise
    .map((e) => `<span class="expertise-tag">${escapeHtml(String(e))}</span>`)
    .join('\n          ');
  return `<div class="about-subsection about-subsection--expertise">
      <h3 class="about-subsection__heading">${labels.expertise}</h3>
      <div class="expertise-tags">\n          ${tags}\n      </div>
    </div>`;
}

module.exports = { generateAchievementsSection, generateExpertiseSection };
