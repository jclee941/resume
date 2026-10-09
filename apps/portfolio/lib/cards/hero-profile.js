'use strict';

const { escapeHtml } = require('../template-sanitizer');
const { profileLabels } = require('./profile');

const TRUST_LABELS = { ko: '자격·수상', en: 'Certifications and awards', ja: '資格・受賞' };
const MAX_CERTIFICATION_CHIPS = 2;

/**
 * @typedef {Object} HeroProfileData
 * @property {{ title?: string }} [hero]
 * @property {Array<{ name?: string, status?: string }>} [certifications]
 * @property {Array<{ name?: string }>} [awards]
 */

/**
 * @param {HeroProfileData | null | undefined} data
 * @param {'ko' | 'en' | 'ja'} locale
 * @param {string} [photo] - Versioned profile photo URL (/assets/*).
 * @returns {string}
 */
function generateHeroPortrait(data, locale, photo) {
  if (!data || !photo) return '';
  const alt = profileLabels(locale).photoAlt(String(data.hero?.title || ''));
  return (
    '<figure class="hero-portrait profile-card profile-card--photo">' +
    `<img class="profile-card__photo" src="${escapeHtml(photo)}" alt="${escapeHtml(alt)}" width="100" height="128" decoding="async" fetchpriority="high">` +
    '</figure>'
  );
}

/**
 * @param {HeroProfileData | null | undefined} data
 * @param {'ko' | 'en' | 'ja'} locale
 * @returns {string}
 */
function generateHeroTrust(data, locale) {
  if (!data) return '';
  const certifications = (data.certifications || [])
    .filter((certification) => certification.name && certification.status === 'active')
    .slice(0, MAX_CERTIFICATION_CHIPS)
    .map((certification) => String(certification.name));
  const awards = (data.awards || [])
    .filter((award) => award.name)
    .map((award) => String(award.name));
  const names = [...certifications, ...awards];
  if (names.length === 0) return '';
  const label = escapeHtml(TRUST_LABELS[locale] || TRUST_LABELS.ko);
  const chips = names.map((name) => `<li class="hero-trust__item">${escapeHtml(name)}</li>`);
  return `<ul class="hero-trust" aria-label="${label}">${chips.join('')}</ul>`;
}

module.exports = { generateHeroPortrait, generateHeroTrust };
