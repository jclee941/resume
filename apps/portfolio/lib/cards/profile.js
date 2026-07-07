'use strict';

const { escapeHtml } = require('../template-sanitizer');

const PROFILE_LABELS = {
  ko: {
    education: '학력',
    languages: '어학',
    awards: '수상',
    openSource: '오픈소스',
    military: '병역',
  },
  en: {
    education: 'Education',
    languages: 'Languages',
    awards: 'Awards',
    openSource: 'Open source',
    military: 'Military service',
  },
  ja: {
    education: '学歴',
    languages: '語学',
    awards: '受賞',
    openSource: 'オープンソース',
    military: '兵役',
  },
};

function profileLabels(locale) {
  return PROFILE_LABELS[locale] || PROFILE_LABELS.ko;
}

/**
 * Generate a compact "profile" bento block surfacing SSoT data that was
 * previously unsurfaced: education, languages, awards, OSS contributions,
 * military service. Rendered as clean mini cards with localized,
 * reader-facing labels (no terminal-style '>' prefixes).
 *
 * @param {Object} data - data.json (uses education, languages, awards,
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
    const period = e.startDate ? ` ${escapeHtml(String(e.startDate))}` : '';
    cards.push(`<div class="profile-card">
        <span class="profile-card__label">${labels.education}</span>
        <p class="profile-card__value">${escapeHtml(String(e.school))}${major}${status}${period}</p>
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

  // Awards
  if (Array.isArray(data.awards) && data.awards.length > 0) {
    const items = data.awards
      .map((a) => {
        const org = a.organization
          ? ` <span class="profile-card__muted">${escapeHtml(String(a.organization))}</span>`
          : '';
        const year = a.year ? ` (${escapeHtml(String(a.year))})` : '';
        return `<li>${escapeHtml(String(a.name))}${org}${year}</li>`;
      })
      .join('');
    cards.push(`<div class="profile-card">
        <span class="profile-card__label">${labels.awards}</span>
        <ul class="profile-card__list">${items}</ul>
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

module.exports = { generateProfileBento };
