const { HERO_CONTENT } = require('./hero-content-data');

const CONTACT_EMAIL = 'qws941@kakao.com';
const RESUME_PDF_PATH = '/resume.pdf';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

function renderHeroTitle(content) {
  const srTitle = content.srTitle ? `<span class="sr-only"> ${content.srTitle}</span>` : '';
  return `<h1 class="hero-title" role="heading" aria-level="1">${content.title}${srTitle}</h1>`;
}

function renderProofList(content) {
  const items = content.proofItems.map((item) => `<li>${item}</li>`).join('');
  return `<ul class="hero-proof-list" aria-label="${content.proofLabel}">${items}</ul>`;
}

function renderReviewPath(content) {
  const links = content.reviewLinks
    .map(
      ([href, eyebrow, label]) =>
        `<a href="${href}"><span>${eyebrow}</span><strong>${label}</strong></a>`
    )
    .join('');
  return `<nav class="hero-review-path" aria-label="${content.reviewLabel}">${links}</nav>`;
}

function renderReviewPacket(content) {
  const items = content.packetItems
    .map(([term, description], index) => {
      const step = String(index + 1).padStart(2, '0');
      return (
        '<div>' +
        `<span class="hiring-review-packet__step" aria-hidden="true">${step}</span>` +
        `<dt>${term}</dt><dd>${description}</dd></div>`
      );
    })
    .join('');
  return (
    `<div class="hiring-review-packet" aria-label="${content.packetLabel}">` +
    '<div class="hiring-review-packet__header">' +
    `<p class="hiring-review-packet__eyebrow">${content.packetEyebrow}</p>` +
    `<p class="hiring-review-packet__status"><span aria-hidden="true"></span>${content.packetStatus}</p>` +
    '</div>' +
    `<p class="hiring-review-packet__summary">${content.packetSummary}</p>` +
    `<dl class="hiring-review-packet__list">${items}</dl></div>`
  );
}

function renderRoleQuickPaths(content) {
  const roles = content.quickRoles
    .map(([id, label, proof]) => {
      const accessibleLabel = `${label}: ${proof}`;
      return (
        `<button type="button" class="role-chip" data-role-filter="${escapeHtml(id)}" aria-pressed="false" aria-label="${escapeHtml(accessibleLabel)}" disabled>` +
        `<span class="role-chip__label">${escapeHtml(label)}</span>` +
        '<span class="role-chip__separator" aria-hidden="true"></span>' +
        `<span class="role-chip__proof">${escapeHtml(proof)}</span>` +
        '</button>'
      );
    })
    .join('');
  return (
    `<section class="role-quick-paths" aria-label="${content.quickTitle}">` +
    '<div class="role-quick-paths__header">' +
    `<h2 class="role-quick-paths__title">${content.quickTitle}</h2>` +
    `<p class="role-quick-paths__desc">${content.quickDesc}</p>` +
    '</div>' +
    `<div class="role-quick-paths__controls" role="group" aria-label="${content.quickTitle}">${roles}</div>` +
    '</section>'
  );
}

function buildMailHref(subject) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function renderActions(content) {
  const [contact, resume, projects, pdf] = content.actions;
  return (
    `<div class="hero-cta" role="group" aria-label="${content.actionsLabel}">` +
    `<a href="${buildMailHref(content.mailSubject)}" class="link-subtle link-subtle--primary">${contact}</a>` +
    `<a href="#resume" class="link-subtle">${resume}</a>` +
    `<a href="#projects" class="link-subtle">${projects}</a>` +
    `<a href="${RESUME_PDF_PATH}" download="${content.downloadName}" class="link-subtle">${pdf}</a>` +
    '</div>'
  );
}

function buildHeroContent(locale) {
  const content = HERO_CONTENT[locale] || HERO_CONTENT.ko;
  return [
    renderHeroTitle(content),
    `<p class="hero-role">${content.role}</p>`,
    `<p class="hero-availability">${content.availability}</p>`,
    `<p class="hero-positioning">${content.positioning}</p>`,
    renderProofList(content),
    renderActions(content),
    renderReviewPath(content),
    renderReviewPacket(content),
    renderRoleQuickPaths(content),
  ].join('');
}

module.exports = { buildHeroContent };
