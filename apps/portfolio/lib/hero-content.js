const { HERO_CONTENT } = require('./hero-content-data');

const JAPANESE_PRIMARY_CTA = '注目プロジェクトを見る';

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
  return `<h1 class="hero-title">${escapeHtml(content.name)}</h1>`;
}

function encodeCtaDisplayLabel(label) {
  return label === JAPANESE_PRIMARY_CTA ? [...label].join('\u2060') : label;
}

function renderCta({ href, label }, className) {
  const displayLabel = encodeCtaDisplayLabel(label);
  const accessibleName = displayLabel === label ? '' : ` aria-label="${escapeHtml(label)}"`;
  return `<a href="${escapeHtml(href)}" class="${className}"${accessibleName}>${escapeHtml(displayLabel)}</a>`;
}

function renderActions(content) {
  return [
    '<div class="hero-cta">',
    renderCta(content.primaryCta, 'link-subtle link-subtle--primary'),
    renderCta(content.secondaryCta, 'link-subtle'),
    '</div>',
  ].join('');
}

function renderProjectProofs(content) {
  const links = content.proofLinks
    .map(({ href, label }) => renderCta({ href, label }, 'hero-project-proof-link'))
    .join('');
  return `<div class="hero-public-proof"><div class="hero-public-proof__links">${links}</div></div>`;
}

function buildHeroContent(locale) {
  const content = HERO_CONTENT[locale] || HERO_CONTENT.ko;
  return [
    renderHeroTitle(content),
    `<p class="hero-role">${escapeHtml(content.primaryTitle)}</p>`,
    `<p class="hero-tagline">${escapeHtml(content.supportingLine)}</p>`,
    `<p class="hero-availability">${escapeHtml(content.availability)}</p>`,
    `<p class="hero-positioning">${escapeHtml(content.proposition)}</p>`,
    renderActions(content),
    renderProjectProofs(content),
  ].join('');
}

module.exports = { buildHeroContent };
