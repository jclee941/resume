'use strict';

const { escapeHtml } = require('../template-sanitizer');

const PROFILE_LABELS = {
  ko: {
    education: '학력',
    languages: '어학',
    awards: '수상',
    openSource: '오픈소스',
    military: '병역',
    photoAlt: (/** @type {string} */ name) => `${name} 증명사진`,
  },
  en: {
    education: 'Education',
    languages: 'Languages',
    awards: 'Awards',
    openSource: 'Open source',
    military: 'Military service',
    photoAlt: (/** @type {string} */ name) => `Photo of ${name}`,
  },
  ja: {
    education: '学歴',
    languages: '語学',
    awards: '受賞',
    openSource: 'オープンソース',
    military: '兵役',
    photoAlt: (/** @type {string} */ name) => `${name}の証明写真`,
  },
};

/**
 * @typedef {Object} ProfileEducation
 * @property {string} school
 * @property {string} [major]
 * @property {string} [status]
 * @property {string} [startDate]
 * @property {string} [endDate]
 */

/**
 * @typedef {Object} ProfileLanguage
 * @property {string} name
 * @property {string} [level]
 * @property {string} [note]
 */

/**
 * @typedef {Object} ProfileAward
 * @property {string} [id]
 * @property {string} name
 * @property {string} [organization]
 * @property {string} [year]
 */

/**
 * @typedef {Object} ProfileOssContribution
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [url]
 * @property {string} [description]
 * @property {string[]} [techStack]
 * @property {string} [role]
 */

/**
 * @typedef {Object} ProfileMilitary
 * @property {string} [status]
 * @property {string} [period]
 */

/**
 * @typedef {Object} ProfileBentoData
 * @property {ProfileEducation} [education]
 * @property {ProfileLanguage[]} [languages]
 * @property {ProfileAward[]} [awards]
 * @property {ProfileOssContribution[]} [ossContributions]
 * @property {ProfileMilitary} [military]
 * @property {{ title?: string }} [hero]
 */

/**
 * @param {string} [locale]
 * @returns {typeof PROFILE_LABELS.ko}
 */
function profileLabels(locale) {
  return PROFILE_LABELS[/** @type {keyof typeof PROFILE_LABELS} */ (locale)] || PROFILE_LABELS.ko;
}

/**
 * Generate a compact "profile" bento block surfacing SSoT data that was
 * previously unsurfaced: education, languages, awards, OSS contributions,
 * military service. Rendered as clean mini cards with localized,
 * reader-facing labels (no terminal-style '>' prefixes).
 *
 * @param {ProfileBentoData | null | undefined} data - data.json (uses education, languages, awards,
 *   ossContributions, military).
 * @param {'ko'|'en'|'ja'} [locale='ko'] - Locale for card labels.
 * @returns {string} HTML for the profile bento, or '' if nothing to show.
 */
function generateProfileBento(data, locale = 'ko') {
  if (!data) return '';
  const labels = profileLabels(locale);
  const cards = [];

  // Education
  if (data.education && data.education.school) {
    const e = data.education;
    const major = e.major ? ` · ${escapeHtml(String(e.major))}` : '';
    const status = e.status ? ` (${escapeHtml(String(e.status))})` : '';
    const end = e.endDate ? ` ~ ${escapeHtml(String(e.endDate))}` : '';
    const period = e.startDate ? ` ${escapeHtml(String(e.startDate))}${end}` : '';
    cards.push(`<div class="profile-card">
        <span class="profile-card__label">${labels.education}</span>
        <p class="profile-card__value">${escapeHtml(String(e.school))}${major}${status}${period}</p>
      </div>`);
  }

  // Awards follow education (same school); on desktop this order also balances the two
  // bento columns: education + awards | languages + open source + military.
  if (Array.isArray(data.awards) && data.awards.length > 0) {
    const items = data.awards
      .map((a) => {
        const org = a.organization
          ? ` <span class="profile-card__muted">${escapeHtml(String(a.organization))}</span>`
          : '';
        const year =
          a.year && !String(a.name).includes(String(a.year))
            ? ` (${escapeHtml(String(a.year))})`
            : '';
        return `<li>${escapeHtml(String(a.name))}${org}${year}</li>`;
      })
      .join('');
    cards.push(`<div class="profile-card">
        <span class="profile-card__label">${labels.awards}</span>
        <ul class="profile-card__list">${items}</ul>
      </div>`);
  }

  // Languages
  if (Array.isArray(data.languages) && data.languages.length > 0) {
    const langs = data.languages
      .map(
        (l) =>
          `${escapeHtml(String(l.name))} <span class="profile-card__muted">${escapeHtml(String(l.level || ''))}</span>`
      )
      .join(' · ');
    cards.push(`<div class="profile-card">
        <span class="profile-card__label">${labels.languages}</span>
        <p class="profile-card__value">${langs}</p>
      </div>`);
  }

  // OSS contributions
  if (Array.isArray(data.ossContributions) && data.ossContributions.length > 0) {
    const items = data.ossContributions
      .map((o) => {
        const name = escapeHtml(String(o.name || 'project'));
        if (o.url) {
          const safeUrl = /^https?:\/\//.test(String(o.url)) ? String(o.url) : '#';
          return `<li><a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener">${name}</a></li>`;
        }
        return `<li>${name}</li>`;
      })
      .join('');
    cards.push(`<div class="profile-card">
        <span class="profile-card__label">${labels.openSource}</span>
        <ul class="profile-card__list">${items}</ul>
      </div>`);
  }

  // Military service
  if (data.military && data.military.status) {
    const m = data.military;
    const period = m.period
      ? ` <span class="profile-card__muted">${escapeHtml(String(m.period))}</span>`
      : '';
    cards.push(`<div class="profile-card">
        <span class="profile-card__label">${labels.military}</span>
        <p class="profile-card__value">${escapeHtml(String(m.status))}${period}</p>
      </div>`);
  }

  if (cards.length === 0) return '';
  return `<div class="profile-bento">
      ${cards.join('\n      ')}
    </div>`;
}

module.exports = { generateProfileBento, profileLabels };
