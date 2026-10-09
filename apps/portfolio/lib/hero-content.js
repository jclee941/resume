const { HERO_CONTENT } = require('./hero-content-data');
const { defaultOwnerIdentity } = require('./owner-identity');

const RESUME_PDF_PATH = '/resume.pdf';

/**
 * @typedef {'ko' | 'en' | 'ja'} HeroLocale
 */

/**
 * @typedef {typeof HERO_CONTENT[HeroLocale] & { srTitle?: string }} HeroContent
 */

/**
 * @typedef {Object} HeroParts
 * @property {string} [portraitHtml]
 * @property {string} [trustHtml]
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      /** @type {Record<string, string>} */ ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

/**
 * @param {string} [locale]
 * @returns {HeroContent}
 */
function heroContentFor(locale) {
  return HERO_CONTENT[/** @type {HeroLocale} */ (locale)] || HERO_CONTENT.ko;
}

/**
 * @param {HeroContent} content
 * @returns {string}
 */
function renderHeroTitle(content) {
  const srTitle = content.srTitle
    ? `<span class="sr-only"> ${escapeHtml(content.srTitle)}</span>`
    : '';
  return `<h1 class="hero-title" role="heading" aria-level="1">${escapeHtml(content.title)}${srTitle}</h1>`;
}

/**
 * @param {HeroContent} content
 * @returns {string}
 */
function renderProofList(content) {
  const items = content.proofItems
    .slice(0, 2)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  return `<ul class="hero-proof-list" aria-label="${escapeHtml(content.proofLabel)}">${items}</ul>`;
}

/**
 * @param {HeroContent} content
 * @param {string} contactEmail
 * @returns {string}
 */
function renderActions(content, contactEmail) {
  const [contact, , projects, pdf] = content.actions;
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(content.mailSubject)}`;
  return (
    `<div class="hero-cta" role="group" aria-label="${escapeHtml(content.actionsLabel)}">` +
    `<a href="${escapeHtml(mailto)}" class="link-subtle link-subtle--primary">${escapeHtml(contact)}</a>` +
    `<a href="${RESUME_PDF_PATH}" download="${escapeHtml(content.downloadName)}" class="link-subtle">${escapeHtml(pdf)}</a>` +
    `<a href="#projects" class="link-subtle link-subtle--quiet">${escapeHtml(projects)}</a>` +
    '</div>'
  );
}

/**
 * @param {HeroContent} content
 * @returns {string}
 */
function renderRoleQuickPaths(content) {
  const roles = content.quickRoles
    .map(([id, label, proof]) => {
      // No aria-label: the accessible name comes from the visible
      // label/count/proof spans (WCAG 2.5.3 Label in Name).
      return (
        `<button type="button" class="role-chip" data-role-filter="${escapeHtml(id)}" aria-pressed="false" disabled>` +
        `<span class="role-chip__label">${escapeHtml(label)}</span>` +
        '<span class="role-chip__separator" aria-hidden="true"></span>' +
        `<span class="role-chip__proof">${escapeHtml(proof)}</span>` +
        '</button>'
      );
    })
    .join('');
  const title = escapeHtml(content.quickTitle);
  return (
    `<section class="role-quick-paths" aria-label="${title}">` +
    '<div class="role-quick-paths__header">' +
    `<h3 class="role-quick-paths__title">${title}</h3>` +
    `<p class="role-quick-paths__desc">${escapeHtml(content.quickDesc)}</p>` +
    '</div>' +
    `<div class="role-quick-paths__controls" role="group" aria-label="${title}">${roles}</div>` +
    '</section>'
  );
}

/**
 * @param {string} [locale]
 * @param {import('./owner-identity').OwnerIdentity} [identity] - contact owner; defaults to the master resume owner
 * @param {HeroParts} [parts]
 * @returns {string}
 */
function buildHeroContent(locale, identity = defaultOwnerIdentity(), parts = {}) {
  const content = heroContentFor(locale);
  const { portraitHtml = '', trustHtml = '' } = parts;
  const availability = `<p class="hero-availability">${escapeHtml(content.availability)}</p>`;
  return [
    '<div class="hero-layout">',
    '<header class="hero-identity">',
    renderHeroTitle(content),
    `<p class="hero-role">${escapeHtml(content.role)}</p>`,
    `<p class="hero-positioning">${escapeHtml(content.positioning)}</p>`,
    renderActions(content, identity.email),
    renderProofList(content),
    trustHtml,
    '</header>',
    `<div class="hero-aside">${portraitHtml}${availability}</div>`,
    '</div>',
  ].join('');
}

/**
 * @param {string} [locale]
 * @returns {string}
 */
function buildProjectRolePaths(locale) {
  return renderRoleQuickPaths(heroContentFor(locale));
}

module.exports = { buildHeroContent, buildProjectRolePaths };
