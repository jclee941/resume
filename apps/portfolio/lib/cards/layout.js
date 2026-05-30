const { escapeHtml } = require('../template-sanitizer');

/**
 * Generate hero section HTML from data
 * ✅ FIXED: Added aria-label to email link for accessibility
 * @param {Object} heroData - Hero section data
 * @returns {string} HTML string for hero section
 */
function generateHeroContent(heroData) {
  return `
    <h1 class="hero-name">${escapeHtml(heroData.titleEn)}</h1>
    <h2 class="hero-subtitle">${escapeHtml(heroData.subtitle)}</h2>
    <div class="hero-contact">
       <a href="mailto:${escapeHtml(heroData.email || 'qws941@kakao.com')}" class="hero-link" aria-label="Email">${escapeHtml(heroData.email || 'qws941@kakao.com')}</a>
    </div>
  `;
}

/**
 * Generate infrastructure cards HTML from data
 * @param {Array} infraData - Array of infrastructure objects with {icon, title, description, status, url?}
 * @returns {string} HTML string for infrastructure cards
 */
function generateInfrastructureCards(infraData) {
  if (!infraData || infraData.length === 0) return '';

  return infraData
    .map((item) => {
      const statusClass = item.status === 'running' ? 'infra-status--running' : 'infra-status--stopped';
      const statusLabel = item.status === 'running' ? 'RUNNING' : 'STOPPED';
      const titleContent = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="infra-link" aria-label="Open ${escapeHtml(item.title)} (opens in new tab)">${escapeHtml(item.icon)} ${escapeHtml(item.title)} <span class="arrow">↗</span></a>`
        : `<span>${escapeHtml(item.icon)} ${escapeHtml(item.title)}</span>`;

      return `
        <li class="infra-card">
          <div class="infra-header">
            <span class="infra-title">${titleContent}</span>
            <span class="infra-status ${statusClass}">[${statusLabel}]</span>
          </div>
          <p class="infra-desc">${escapeHtml(item.description)}</p>
        </li>`;
    })
    .join('\n');
}

/**
 * Generate contact grid HTML from data
 * ✅ FIXED: Added aria-labels to all links for accessibility
 * ✅ FIXED: Added target="_blank" and rel to website link
 * @param {Object} contactData - Contact information object
 * @returns {string} HTML string with accessible footer links
 */
function generateContactGrid(contactData) {
  const velog = contactData.velog || 'https://velog.io/@qws941';
  return `
        <a href="${escapeHtml(contactData.github)}" target="_blank" rel="noopener noreferrer" class="contact-item" role="listitem" aria-label="GitHub (opens in new tab)">GitHub</a>
        <a href="${escapeHtml(contactData.linkedin)}" target="_blank" rel="noopener noreferrer" class="contact-item" role="listitem" aria-label="LinkedIn (opens in new tab)">LinkedIn</a>
        <a href="${escapeHtml(velog)}" target="_blank" rel="noopener noreferrer" class="contact-item" role="listitem" aria-label="Velog (opens in new tab)">Velog</a>
        <a href="mailto:${escapeHtml(contactData.email)}" class="contact-item" role="listitem" aria-label="Email">Email</a>
        <a href="${escapeHtml(contactData.website)}" target="_blank" rel="noopener noreferrer" class="contact-item" role="listitem" aria-label="Website (opens in new tab)">Website</a>
  `;
}

module.exports = {
  generateHeroContent,
  generateInfrastructureCards,
  generateContactGrid,
};
